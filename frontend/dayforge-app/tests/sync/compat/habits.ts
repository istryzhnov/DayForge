/** Compat checks: habit unification, streaks and the habit strip. */

import { fullDayStreak, habitMonthView, habitStats, habitStripCells } from '../../../src/composables/analytics/habits'
import type { RecurrenceRule } from '../../../src/entities/RecurrenceEntity'
import type { ISODate } from '../../../src/entities/types'
import type { DailyTask, TaskTemplate } from '../../../src/entities/TaskEntity'
import { RECURRENCE_TYPE } from '../../../src/entities/constants'
import { T0, T1, check, same, section } from './harness'

export function verifyHabitUnification() {
  section('Habits: one set of numbers for Analytics and the project panel')

  const TODAY = '2026-10-10' as ISODate
  const OCT = '2026-10-01' as ISODate
  const END = '2026-10-31' as ISODate

  function isoRange(from: string, to: string): string[] {
    const dates: string[] = []
    const cursor = new Date(`${from}T00:00:00Z`)
    const last = new Date(`${to}T00:00:00Z`)
    while (cursor <= last) {
      dates.push(cursor.toISOString().slice(0, 10))
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
    return dates
  }

  function rule(
    type: RecurrenceRule['type'],
    startDate: string,
    extra: Partial<RecurrenceRule> = {},
  ): RecurrenceRule {
    return { type, startDate: startDate as ISODate, ...extra }
  }

  function habit(
    id: string,
    recurrence: RecurrenceRule | undefined,
    overrides: Record<string, unknown> = {},
  ): TaskTemplate {
    return {
      id,
      title: id,
      priority: 'minor',
      order: 0,
      tagIds: [],
      isActive: true,
      recurrence,
      createdAt: T0,
      updatedAt: T0,
      ...overrides,
    } as TaskTemplate
  }

  function doneRows(
    templateId: string,
    dates: string[],
    overrides: Record<string, unknown> = {},
  ): DailyTask[] {
    return dates.map(
      (date) =>
        ({
          id: `${templateId}::${date}`,
          date,
          templateId,
          title: templateId,
          priority: 'minor',
          tagIds: [],
          status: 'done',
          createdAt: T0,
          updatedAt: T0,
          ...overrides,
        }) as DailyTask,
    )
  }

  const total = (values: number[]) => values.reduce((sum, value) => sum + value, 0)

  const read = habit('read', rule(RECURRENCE_TYPE.DAILY, '2026-10-01'), { goalId: 'goal-a' })

  // A daily habit with no rows at all: every past day is still missed.
  const bare = habitMonthView({ templates: [read], dailyTasks: [], month: OCT, today: TODAY })
  const bareCells = bare.rows[0].cells.map((cell) => cell.state)
  check(
    'a past day with no rows is missed; today pending; later days upcoming',
    bareCells[8] === 'missed' && bareCells[9] === 'pending' && bareCells[10] === 'upcoming',
    bareCells.slice(0, 11),
  )
  check(
    'expected counts due days up to today only (10, not 31)',
    bare.expected === 10 && bare.completed === 0 && bare.fullDays === 0 && bare.currentStreak === 0,
    bare,
  )

  // Done through yesterday, today still open.
  const toYesterday = doneRows('read', isoRange('2026-10-01', '2026-10-09'))
  const open = habitMonthView({ templates: [read], dailyTasks: toYesterday, month: OCT, today: TODAY })
  check(
    'a pending today does not break the streak or count as missed',
    open.currentStreak === 9 && open.rows[0].cells[9].state === 'pending',
    open,
  )
  check('pending today is not yet a full day', open.fullDays === 9 && open.trackedDays === 10, open)

  // One missed past day ends the run, even with nothing stored for it.
  const broken = habitMonthView({
    templates: [read],
    dailyTasks: toYesterday.filter((row) => row.date !== '2026-10-05'),
    month: OCT,
    today: TODAY,
  })
  check('a missed past day ends the streak', broken.currentStreak === 4, broken.currentStreak)

  // Weekly on Mon, Wed, Fri: Sat and Sun are off days and must not break anything.
  const gym = habit('gym', rule(RECURRENCE_TYPE.WEEKLY, '2026-10-01', { daysOfWeek: [1, 3, 5] }))
  const gymDone = doneRows('gym', ['2026-10-02', '2026-10-05', '2026-10-07', '2026-10-09'])
  const gymView = habitMonthView({ templates: [gym], dailyTasks: gymDone, month: OCT, today: TODAY })
  check(
    'off days are skipped: they neither break nor extend the streak',
    gymView.currentStreak === 4 && gymView.fullDays === 4 && gymView.expected === 4,
    gymView,
  )
  check('an off day shows as off', gymView.rows[0].cells[0].state === 'off')

  // A run that starts in September and carries through October.
  const stretch = habit('stretch', rule(RECURRENCE_TYPE.DAILY, '2026-09-27'))
  const stretchDone = doneRows('stretch', isoRange('2026-09-27', '2026-10-09'))
  const october = habitMonthView({ templates: [stretch], dailyTasks: stretchDone, month: OCT, today: TODAY })
  const september = habitMonthView({
    templates: [stretch],
    dailyTasks: stretchDone,
    month: '2026-09-01' as ISODate,
    today: TODAY,
  })
  check(
    'the day streak crosses the month end (13 days) in both months',
    october.currentStreak === 13 &&
      september.currentStreak === 13 &&
      fullDayStreak({ templates: [stretch], dailyTasks: stretchDone, today: TODAY }) === 13,
    [october.currentStreak, september.currentStreak],
  )
  check(
    'full days are still counted per month',
    october.fullDays === 9 && september.fullDays === 4,
    [october.fullDays, september.fullDays],
  )

  // Deleted, paused and one-off tasks never count; a deleted done row is not a done day.
  const gone = habit('old', rule(RECURRENCE_TYPE.DAILY, '2026-10-01'), { deletedAt: T1 })
  const paused = habit('paused', rule(RECURRENCE_TYPE.DAILY, '2026-10-01'), { isActive: false })
  const oneOff = habit('one-off', rule(RECURRENCE_TYPE.NONE, '2026-10-01'))
  const withoutSixth = toYesterday.filter((row) => row.date !== '2026-10-06')
  const messy = [
    ...withoutSixth,
    ...doneRows('old', ['2026-10-01']),
    ...doneRows('paused', ['2026-10-02']),
    ...doneRows('one-off', ['2026-10-03']),
    ...doneRows('read', ['2026-10-06'], { deletedAt: T1 }),
  ]
  const templates = [read, gone, paused, oneOff]
  const messyView = habitMonthView({ templates, dailyTasks: messy, month: OCT, today: TODAY })
  check(
    'deleted, paused and one-off templates are ignored',
    messyView.rows.map((row) => row.templateId).join() === 'read',
    messyView.rows.map((row) => row.templateId),
  )
  check(
    'a deleted done row does not tick its day',
    messyView.rows[0].cells[5].state === 'missed' && messyView.currentStreak === 3,
    messyView.rows[0].cells[5],
  )
  check(
    'Analytics table ignores the same templates',
    habitStats({ templates, dailyTasks: messy, from: OCT, to: END, today: TODAY })
      .map((stat) => stat.templateId)
      .join() === 'read',
  )

  // Analytics and the project panel share one function; numbers must agree.
  const goalB = habit('gym', rule(RECURRENCE_TYPE.WEEKLY, '2026-10-01', { daysOfWeek: [1, 3, 5] }), {
    goalId: 'goal-b',
  })
  const allRows = [...toYesterday, ...gymDone, ...doneRows('stretch', ['2026-10-03'])]
  const everyone = [read, goalB, stretch]
  const analytics = habitStats({ templates: everyone, dailyTasks: allRows, from: OCT, to: END, today: TODAY })
  const monthView = habitMonthView({ templates: everyone, dailyTasks: allRows, month: OCT, today: TODAY })
  check(
    'Analytics totals equal the month view totals',
    total(analytics.map((stat) => stat.expected)) === monthView.expected &&
      total(analytics.map((stat) => stat.completed)) === monthView.completed,
    { analytics, monthView: [monthView.expected, monthView.completed] },
  )
  check(
    'per-habit due and done counts match row by row',
    analytics.every((stat) => {
      const row = monthView.rows.find((item) => item.templateId === stat.templateId)
      return row !== undefined && row.expected === stat.expected && row.completed === stat.completed
    }),
  )

  const projectTemplates = everyone.filter((template) => template.goalId === 'goal-a')
  const projectView = habitMonthView({ templates: projectTemplates, dailyTasks: allRows, month: OCT, today: TODAY })
  const projectStats = habitStats({ templates: projectTemplates, dailyTasks: allRows, from: OCT, to: END, today: TODAY })
  check(
    'project panel numbers equal Analytics scoped to that project',
    projectView.expected === total(projectStats.map((stat) => stat.expected)) &&
      projectView.completed === total(projectStats.map((stat) => stat.completed)) &&
      projectView.expected === 10 &&
      projectView.completed === 9,
    projectView,
  )
  check(
    'a project with no habits has no numbers',
    habitMonthView({ templates: [], dailyTasks: allRows, month: OCT, today: TODAY }).currentStreak === 0,
  )
}

export function verifyHabitStrip() {
  section('Habit strip: squares run up to today, in order')

  const cells = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29'].map((date) => ({ date, state: 'off' as const }))
  check('habitStripCells: a month in progress stops at today', same(habitStripCells(cells, '2026-10-27').map((cell) => cell.date), ['2026-10-26', '2026-10-27']))
  check('habitStripCells: today is kept as the last square', habitStripCells(cells, '2026-10-27').at(-1)?.date === '2026-10-27')
  check('habitStripCells: a past month keeps every day', habitStripCells(cells, '2026-12-01').length === 4)
  check('habitStripCells: no square before the month, nothing left', habitStripCells(cells, '2026-10-25').length === 0)
}
