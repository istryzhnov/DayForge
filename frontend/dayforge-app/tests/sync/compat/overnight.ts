/** Compat checks: tasks that run past midnight into the next day. */

import type { DailyTask, TaskTemplate } from '../../../src/entities/TaskEntity'
import {
  PRIORITY,
  RECURRENCE_TYPE,
  TASK_STATUS,
} from '../../../src/entities/constants'
import {
  durationMinutes,
  isOvernight,
  rowsShownOn,
  segmentForDay,
} from '../../../src/composables/goalSpace/overnight'
import { ensureTodaySnapshot } from '../../../src/composables/goalSpace/dailyTasks'
import { plannedMsByProject } from '../../../src/features/analytics/composables/planVsActual'
import {
  collectDayEvents,
  groupRowsByDate,
} from '../../../src/features/calendar/composables/useCalendarOccurrences'
import { check, same, section } from './harness'

// Past dates: the done-state check opens a day, and today's day runs the settings path.
const DAY = '2025-03-10'
const NEXT = '2025-03-11'
const MINUTE_MS = 60 * 1000

function nightTemplate(overrides: Partial<TaskTemplate> = {}): TaskTemplate {
  return {
    id: 'night',
    goalId: 'goal-a',
    title: 'Night shift',
    priority: PRIORITY.MINOR,
    order: 0,
    tagIds: [],
    recurrence: { type: RECURRENCE_TYPE.DAILY, interval: 1, startDate: DAY },
    startTime: '22:00',
    endTime: '07:00',
    isActive: true,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  } as TaskTemplate
}

function nightRow(overrides: Partial<DailyTask> = {}): DailyTask {
  return {
    id: `night::${DAY}`,
    date: DAY,
    templateId: 'night',
    goalId: 'goal-a',
    title: 'Night shift',
    priority: PRIORITY.MINOR,
    status: TASK_STATUS.TODO,
    tagIds: [],
    startTime: '22:00',
    endTime: '07:00',
    ...overrides,
  } as DailyTask
}

export function verifyOvernightTasks() {
  section('Overnight tasks: one block, two days')

  check(
    '22:00 to 07:00 runs past midnight',
    isOvernight('22:00', '07:00') === true,
  )
  check(
    '07:00 to 22:00 stays on one day',
    isOvernight('07:00', '22:00') === false,
  )
  check(
    'equal start and end is not a block, so not overnight',
    isOvernight('22:00', '22:00') === false,
  )
  check(
    'a block with no end is not overnight',
    isOvernight('22:00', undefined) === false,
  )

  check(
    'duration: 22:00 to 07:00 is 9 hours, never negative',
    durationMinutes('22:00', '07:00') === 540,
  )
  check(
    'duration: a block ending at midnight counts up to it',
    durationMinutes('22:00', '00:00') === 120,
  )
  check(
    'duration: an ordinary block is unchanged',
    durationMinutes('09:00', '10:30') === 90,
  )
  check(
    'duration: equal or missing times count for nothing',
    durationMinutes('22:00', '22:00') === 0 &&
      durationMinutes('22:00', undefined) === 0,
  )

  const block = { date: DAY, startTime: '22:00', endTime: '07:00' }
  check(
    'segment on the start day runs to midnight',
    same(segmentForDay(DAY, block), {
      startTime: '22:00',
      endTime: '24:00',
      continuesFromPrevious: false,
      continuesNextDay: true,
    }),
    segmentForDay(DAY, block),
  )
  check(
    'segment on the next day runs from midnight to the end',
    same(segmentForDay(NEXT, block), {
      startTime: '00:00',
      endTime: '07:00',
      continuesFromPrevious: true,
      continuesNextDay: false,
    }),
    segmentForDay(NEXT, block),
  )
  check(
    'no segment two days on, or the day before',
    segmentForDay('2025-03-12', block) === null &&
      segmentForDay('2025-03-09', block) === null,
  )
  check(
    'a block ending at midnight leaves no tail for the next day',
    segmentForDay(NEXT, { ...block, endTime: '00:00' }) === null,
  )

  const sameDay = nightRow({
    id: 'day::x',
    templateId: 'day',
    startTime: '09:00',
    endTime: '10:00',
  })
  const shown = rowsShownOn([sameDay, nightRow()], NEXT)
  check(
    'the next day lists the overnight row, not an ordinary one from before',
    shown.length === 1 && shown[0].templateId === 'night',
    shown,
  )

  section('Overnight tasks: plan split across days')

  // A one-off template, so the only occurrence is the materialised row.
  const source = {
    templates: [
      nightTemplate({
        recurrence: { type: RECURRENCE_TYPE.NONE, startDate: DAY },
      }),
    ],
    dailyTasks: [nightRow()],
    defaultDurationMinutes: 60,
  }
  const plannedOn = (day: string) =>
    plannedMsByProject(source, day, day).get('goal-a') ?? 0

  check(
    'the plan counts 2 hours on the start day',
    plannedOn(DAY) === 120 * MINUTE_MS,
    plannedOn(DAY),
  )
  check(
    'the plan counts 7 hours on the next day',
    plannedOn(NEXT) === 420 * MINUTE_MS,
    plannedOn(NEXT),
  )

  section('Overnight tasks: daily repeat spills into the next day')

  const repeating = {
    templates: [nightTemplate()],
    dailyTasks: [],
    defaultDurationMinutes: 60,
  }
  check(
    'a repeating overnight rule plans its own evening and the morning before it',
    (plannedMsByProject(repeating, NEXT, NEXT).get('goal-a') ?? 0) ===
      540 * MINUTE_MS,
  )

  const noRows = groupRowsByDate([])
  const onNext = collectDayEvents({
    templates: [nightTemplate()],
    rowsByDate: noRows,
    date: NEXT,
  })
  check(
    'the next day draws the tail from midnight to 07:00',
    onNext.some(
      (event) =>
        event.key.endsWith('@tail') &&
        event.startTime === '00:00' &&
        event.endTime === '07:00',
    ),
    onNext,
  )
  const onStart = collectDayEvents({
    templates: [nightTemplate()],
    rowsByDate: noRows,
    date: DAY,
  })
  check(
    'the start day draws the block from 22:00 to midnight',
    onStart.some(
      (event) => event.startTime === '22:00' && event.endTime === '24:00',
    ),
    onStart,
  )

  section('Overnight tasks: one occurrence, one done state')

  const templates = [nightTemplate()]
  const dailyTasks: DailyTask[] = []
  ensureTodaySnapshot(templates, dailyTasks, NEXT, new Set())

  const startRows = dailyTasks.filter((item) => item.date === DAY)
  check(
    'opening the next day creates the start day row it shows',
    startRows.length === 1,
    dailyTasks,
  )

  const startRow = startRows[0]
  startRow.status = TASK_STATUS.DONE
  startRow.completedAt = '2026-10-28T06:30:00.000Z'

  const shownOnNext = rowsShownOn(dailyTasks, NEXT)
  const tail = shownOnNext.find((item) => item.date === DAY)
  check(
    'ticking the start day row shows as done on the next day too',
    tail?.status === TASK_STATUS.DONE,
    shownOnNext,
  )
  check(
    'the next day keeps its own occurrence, not a copy of the start day',
    shownOnNext.length === 2 &&
      shownOnNext.filter((item) => item.date === NEXT).length === 1,
    shownOnNext,
  )
  check(
    'the tail is the start row itself, so one tick covers both days',
    tail === startRow,
  )
}
