/** Compat checks: calendar titles, and where a dropped block lands. */

import type { DailyTask, TaskTemplate } from '../../../src/entities/TaskEntity'
import type { ISODate } from '../../../src/entities/types'
import {
  capitalizeFirst,
  formatCalendarDayTitle,
  formatCalendarMonthTitle,
  formatCalendarWeekday,
  formatCalendarWeekTitle,
} from '../../../src/features/calendar/composables/calendarTitles'
import { moveRowToDay } from '../../../src/composables/goalSpace/dailyTasks'
import { dailyTaskId } from '../../../src/composables/goalSpace/date'
import { check, section } from './harness'

export function verifyCalendarTitles() {
  section('Calendar titles: one locale, normal capitalisation')

  check(
    'the day title is a plain sentence with English names',
    formatCalendarDayTitle('2026-10-27', 'en-GB') === 'Tuesday 27 October',
    formatCalendarDayTitle('2026-10-27', 'en-GB'),
  )
  check(
    'the month title names the month and year',
    formatCalendarMonthTitle('2026-10-01', 'en-GB') === 'October 2026',
    formatCalendarMonthTitle('2026-10-01', 'en-GB'),
  )
  check(
    'a week across two months names both months',
    formatCalendarWeekTitle('2026-10-26', 'en-GB') === '26 Oct – 1 Nov 2026',
    formatCalendarWeekTitle('2026-10-26', 'en-GB'),
  )
  check(
    'weekday headers use the short English name',
    formatCalendarWeekday('2026-10-27', 'en-GB') === 'Tue',
  )
  check(
    'capitalizeFirst leaves empty text and other letters alone',
    capitalizeFirst('') === '' && capitalizeFirst('october') === 'October',
  )
}

export function verifyMoveRowToDay() {
  section('A block dropped on a later day moves only what can move')

  const TODAY = '2026-11-06' as ISODate
  const LATER = '2026-11-09' as ISODate
  const template = (over: Partial<TaskTemplate>) =>
    ({
      id: 'T',
      title: 'Task',
      priority: 'minor',
      order: 0,
      tagIds: [],
      isActive: true,
      createdAt: '',
      updatedAt: '',
      ...over,
    }) as unknown as TaskTemplate
  const rowOf = (templateId: string, date: ISODate) =>
    ({
      id: dailyTaskId(templateId, date),
      date,
      templateId,
      title: 'Task',
      status: 'todo',
      tagIds: [],
    }) as unknown as DailyTask

  const open = template({})
  const openRow = rowOf('T', TODAY)
  const rows = [openRow]
  check(
    'an open task moves to the day, with its time, and keeps no rule',
    moveRowToDay(open, openRow, rows, LATER, '09:00', '10:00') &&
      openRow.date === LATER &&
      openRow.id === dailyTaskId('T', LATER) &&
      openRow.startTime === '09:00' &&
      openRow.endTime === '10:00' &&
      open.recurrence === undefined,
  )

  const planned = template({
    recurrence: { type: 'none', startDate: TODAY },
  } as Partial<TaskTemplate>)
  const plannedRow = rowOf('T', TODAY)
  check(
    'a one-off planned task moves its date with the row',
    moveRowToDay(planned, plannedRow, [plannedRow], LATER, '09:00', '10:00') &&
      planned.recurrence?.startDate === LATER &&
      plannedRow.date === LATER,
  )

  const habit = template({
    recurrence: { type: 'daily', startDate: TODAY, interval: 1 },
  } as Partial<TaskTemplate>)
  const habitRow = rowOf('T', TODAY)
  check(
    'a repeating task is left on its day: one occurrence cannot move alone',
    !moveRowToDay(habit, habitRow, [habitRow], LATER, '09:00', '10:00') &&
      habitRow.date === TODAY &&
      habitRow.startTime === undefined,
  )

  const clash = rowOf('T', LATER)
  const blocked = rowOf('T', TODAY)
  check(
    'a day that already has a row for the task is not overwritten',
    !moveRowToDay(open, blocked, [blocked, clash], LATER, '09:00', '10:00') &&
      blocked.date === TODAY,
  )
}
