import type { DailyTask, TaskTemplate } from '../../entities/TaskEntity'
import type { ID, ISODate } from '../../entities/types'
import { TASK_STATUS } from '../../entities/constants'
import { addDaysToISODate, addMonthsToISODate } from '../goalSpace/date'
import { isRepeating, occursOn } from '../goalSpace/recurrence'

/** A guard on the day-by-day walk, so "all time" can't run away. */
const MAX_DAYS_SCANNED = 1200

export interface HabitStat {
  templateId: ID
  goalId?: ID
  title: string
  /** Days the rule asked for inside the period, never counting past today. */
  expected: number
  /** Days actually ticked off — the completed repetitions. */
  completed: number
  /** 0–1. */
  completionRate: number
  /** Days done in a row, counting back from the last day asked for. */
  currentStreak: number
  longestStreak: number
}

export interface HabitInput {
  templates: TaskTemplate[]
  /** Every day's rows, not just the open day. */
  dailyTasks: DailyTask[]
  from: ISODate
  to: ISODate
  today: ISODate
}

function doneDatesByTemplate(dailyTasks: DailyTask[]): Map<ID, Set<ISODate>> {
  const done = new Map<ID, Set<ISODate>>()

  dailyTasks.forEach((row) => {
    if (row.status !== TASK_STATUS.DONE) return
    const dates = done.get(row.templateId) ?? new Set<ISODate>()
    dates.add(row.date)
    done.set(row.templateId, dates)
  })

  return done
}

/**
 * The days a rule asked for, straight from the recurrence rather than from the
 * stored rows: a day never opened in the app has no row, yet it was still due.
 */
function expectedDates(
  template: TaskTemplate,
  from: ISODate,
  to: ISODate,
): ISODate[] {
  const dates: ISODate[] = []
  let date = from
  let scanned = 0

  while (date <= to && scanned < MAX_DAYS_SCANNED) {
    if (occursOn(template, date)) dates.push(date)
    date = addDaysToISODate(date, 1)
    scanned += 1
  }

  return dates
}

function streaks(
  dates: ISODate[],
  done: Set<ISODate>,
  today: ISODate,
): { current: number; longest: number } {
  let longest = 0
  let run = 0

  dates.forEach((date) => {
    if (done.has(date)) {
      run += 1
      longest = Math.max(longest, run)
      return
    }
    run = 0
  })

  let current = 0

  for (let index = dates.length - 1; index >= 0; index -= 1) {
    const date = dates[index]
    if (done.has(date)) {
      current += 1
      continue
    }
    // Today is still open, so nothing ticked off yet isn't a broken run.
    if (index === dates.length - 1 && date === today) continue
    break
  }

  return { current, longest }
}

export function habitStats({
  templates,
  dailyTasks,
  from,
  to,
  today,
}: HabitInput): HabitStat[] {
  const doneByTemplate = doneDatesByTemplate(dailyTasks)
  const end = to < today ? to : today

  return templates
    .filter(isRepeating)
    .map((template) => {
      const ruleStart = template.recurrence?.startDate ?? from
      const start = from > ruleStart ? from : ruleStart
      const dates = start > end ? [] : expectedDates(template, start, end)
      const done = doneByTemplate.get(template.id) ?? new Set<ISODate>()
      const completed = dates.filter((date) => done.has(date)).length
      const { current, longest } = streaks(dates, done, today)

      return {
        templateId: template.id,
        goalId: template.goalId,
        title: template.title,
        expected: dates.length,
        completed,
        completionRate: dates.length === 0 ? 0 : completed / dates.length,
        currentStreak: current,
        longestStreak: longest,
      }
    })
    .filter((stat) => stat.expected > 0)
    .sort(
      (a, b) =>
        b.completed - a.completed || b.completionRate - a.completionRate,
    )
}

export type HabitDayState = 'done' | 'missed' | 'pending' | 'upcoming' | 'off'

export interface HabitMonthCell {
  date: ISODate
  state: HabitDayState
}

export interface HabitMonthRow {
  templateId: ID
  goalId?: ID
  title: string
  cells: HabitMonthCell[]
  expected: number
  completed: number
  completionRate: number | null
}

export interface HabitMonthDayTotal {
  date: ISODate
  done: number
  total: number
}

export interface HabitMonthView {
  rows: HabitMonthRow[]
  dayTotals: HabitMonthDayTotal[]
  expected: number
  completed: number
  completionRate: number | null
  fullDays: number
  currentStreak: number
}

export interface HabitMonthInput {
  templates: TaskTemplate[]
  dailyTasks: DailyTask[]
  month: ISODate
  today: ISODate
}

function cellStateOf(
  scheduled: boolean,
  isDone: boolean,
  date: ISODate,
  today: ISODate,
): HabitDayState {
  if (!scheduled) return 'off'
  if (date > today) return 'upcoming'
  if (isDone) return 'done'
  return date === today ? 'pending' : 'missed'
}

function monthDates(month: ISODate): ISODate[] {
  const next = addMonthsToISODate(month, 1)
  const dates: ISODate[] = []
  let date = month

  while (date < next) {
    dates.push(date)
    date = addDaysToISODate(date, 1)
  }

  return dates
}

function monthStreak(dayTotals: HabitMonthDayTotal[], today: ISODate): number {
  let count = 0

  for (let index = dayTotals.length - 1; index >= 0; index -= 1) {
    const day = dayTotals[index]
    if (day.date > today || day.total === 0) continue
    if (day.done === day.total) {
      count += 1
      continue
    }
    if (day.date === today) continue
    break
  }

  return count
}
export function habitMonthView({
  templates,
  dailyTasks,
  month,
  today,
}: HabitMonthInput): HabitMonthView {
  const dates = monthDates(month)
  const done = doneDatesByTemplate(
    dailyTasks.filter((row) => row.deletedAt === undefined),
  )

  const rows = templates
    .filter(isRepeating)
    .map((template): HabitMonthRow => {
      const doneDates = done.get(template.id) ?? new Set<ISODate>()
      const cells = dates.map((date) => ({
        date,
        state: cellStateOf(
          occursOn(template, date),
          doneDates.has(date),
          date,
          today,
        ),
      }))
      const expected = cells.filter((cell) =>
        ['done', 'missed', 'pending'].includes(cell.state),
      ).length
      const completed = cells.filter((cell) => cell.state === 'done').length

      return {
        templateId: template.id,
        goalId: template.goalId,
        title: template.title,
        cells,
        expected,
        completed,
        completionRate: expected === 0 ? null : completed / expected,
      }
    })
    .filter((row) => row.cells.some((cell) => cell.state !== 'off'))

  const dayTotals = dates.map((date, index) => {
    const scheduled = rows.filter((row) => row.cells[index].state !== 'off')
    const doneCount = scheduled.filter(
      (row) => row.cells[index].state === 'done',
    ).length
    return { date, done: doneCount, total: scheduled.length }
  })

  const expected = rows.reduce((sum, row) => sum + row.expected, 0)
  const completed = rows.reduce((sum, row) => sum + row.completed, 0)
  const elapsed = dayTotals.filter((day) => day.date <= today && day.total > 0)

  return {
    rows,
    dayTotals,
    expected,
    completed,
    completionRate: expected === 0 ? null : completed / expected,
    fullDays: elapsed.filter((day) => day.done === day.total).length,
    currentStreak: monthStreak(dayTotals, today),
  }
}
