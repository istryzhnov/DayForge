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
  /** Days up to today that had at least one habit due. */
  trackedDays: number
  fullDays: number
  /** Full days in a row ending today, across month boundaries. */
  currentStreak: number
}

export interface HabitMonthInput {
  templates: TaskTemplate[]
  dailyTasks: DailyTask[]
  month: ISODate
  today: ISODate
}

/** Habits are live repeating templates; paused or deleted ones never count. */
export function habitTemplatesOf(templates: TaskTemplate[]): TaskTemplate[] {
  return templates.filter(
    (template) =>
      template.isActive && !template.deletedAt && isRepeating(template),
  )
}

function doneDatesByTemplate(dailyTasks: DailyTask[]): Map<ID, Set<ISODate>> {
  const done = new Map<ID, Set<ISODate>>()

  dailyTasks.forEach((row) => {
    if (row.deletedAt !== undefined || row.status !== TASK_STATUS.DONE) return
    const dates = done.get(row.templateId) ?? new Set<ISODate>()
    dates.add(row.date)
    done.set(row.templateId, dates)
  })

  return done
}

/** Every day from `from` to `to`, inclusive, up to the scan guard. */
function datesBetween(from: ISODate, to: ISODate): ISODate[] {
  const dates: ISODate[] = []
  let date = from

  while (date <= to && dates.length < MAX_DAYS_SCANNED) {
    dates.push(date)
    date = addDaysToISODate(date, 1)
  }

  return dates
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

function cellStateOf(
  scheduled: boolean,
  isDone: boolean,
  date: ISODate,
  today: ISODate,
): HabitDayState {
  if (!scheduled) return 'off'
  if (date > today) return 'upcoming'
  if (isDone) return 'done'
  // Today is still open, so not ticked yet is pending, not missed.
  return date === today ? 'pending' : 'missed'
}

/**
 * One cell per date. The rule says what was due, so a day never opened in the
 * app is still missed; the rows only say what was done.
 */
function cellsOf(
  template: TaskTemplate,
  done: Set<ISODate>,
  dates: ISODate[],
  today: ISODate,
): HabitMonthCell[] {
  return dates.map((date) => ({
    date,
    state: cellStateOf(occursOn(template, date), done.has(date), date, today),
  }))
}

/** The days that count toward completion: due, and not in the future. */
function isDueSoFar(cell: HabitMonthCell): boolean {
  return (
    cell.state === 'done' || cell.state === 'missed' || cell.state === 'pending'
  )
}

/**
 * Best run and the run ending at the last due day. Off days are skipped, and
 * a pending today neither breaks nor extends the run.
 */
function streaksOf(cells: HabitMonthCell[]): {
  current: number
  longest: number
} {
  let longest = 0
  let run = 0

  cells.forEach((cell) => {
    if (cell.state === 'done') {
      run += 1
      longest = Math.max(longest, run)
      return
    }
    if (cell.state === 'missed') run = 0
  })

  let current = 0

  for (let index = cells.length - 1; index >= 0; index -= 1) {
    const { state } = cells[index]
    if (state === 'missed') break
    if (state === 'done') current += 1
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

  return habitTemplatesOf(templates)
    .map((template) => {
      const ruleStart = template.recurrence?.startDate ?? from
      const start = from > ruleStart ? from : ruleStart
      const cells =
        start > end
          ? []
          : cellsOf(
              template,
              doneByTemplate.get(template.id) ?? new Set<ISODate>(),
              datesBetween(start, end),
              today,
            )
      const due = cells.filter(isDueSoFar)
      const completed = cells.filter((cell) => cell.state === 'done').length
      const { current, longest } = streaksOf(cells)

      return {
        templateId: template.id,
        goalId: template.goalId,
        title: template.title,
        expected: due.length,
        completed,
        completionRate: due.length === 0 ? 0 : completed / due.length,
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

function monthRowsOf(
  templates: TaskTemplate[],
  dailyTasks: DailyTask[],
  dates: ISODate[],
  today: ISODate,
): HabitMonthRow[] {
  const doneByTemplate = doneDatesByTemplate(dailyTasks)

  return habitTemplatesOf(templates)
    .map((template): HabitMonthRow => {
      const cells = cellsOf(
        template,
        doneByTemplate.get(template.id) ?? new Set<ISODate>(),
        dates,
        today,
      )
      const expected = cells.filter(isDueSoFar).length
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
}

/** `rows` and `dates` line up by index, so each day's cell is at the same slot. */
function dayTotalsOf(
  rows: HabitMonthRow[],
  dates: ISODate[],
): HabitMonthDayTotal[] {
  return dates.map((date, index) => {
    const scheduled = rows.filter((row) => row.cells[index].state !== 'off')
    const done = scheduled.filter(
      (row) => row.cells[index].state === 'done',
    ).length
    return { date, done, total: scheduled.length }
  })
}

/** A day with something due is full when every due habit was done. */
function fullDayStreakOf(
  dayTotals: HabitMonthDayTotal[],
  today: ISODate,
): number {
  let count = 0

  for (let index = dayTotals.length - 1; index >= 0; index -= 1) {
    const day = dayTotals[index]
    if (day.date > today || day.total === 0) continue
    if (day.done === day.total) {
      count += 1
      continue
    }
    // Today is still open, so an unfinished today doesn't break the run.
    if (day.date === today) continue
    break
  }

  return count
}

/** Full days in a row ending today, counted back across month boundaries. */
export function fullDayStreak({
  templates,
  dailyTasks,
  today,
}: {
  templates: TaskTemplate[]
  dailyTasks: DailyTask[]
  today: ISODate
}): number {
  const from = addDaysToISODate(today, -(MAX_DAYS_SCANNED - 1))
  const dates = datesBetween(from, today)
  const rows = monthRowsOf(templates, dailyTasks, dates, today)
  return fullDayStreakOf(dayTotalsOf(rows, dates), today)
}

function viewOfDates(
  templates: TaskTemplate[],
  dailyTasks: DailyTask[],
  dates: ISODate[],
  today: ISODate,
): HabitMonthView {
  const rows = monthRowsOf(templates, dailyTasks, dates, today)
  const dayTotals = dayTotalsOf(rows, dates)

  const expected = rows.reduce((sum, row) => sum + row.expected, 0)
  const completed = rows.reduce((sum, row) => sum + row.completed, 0)
  const elapsed = dayTotals.filter((day) => day.date <= today && day.total > 0)

  return {
    rows,
    dayTotals,
    expected,
    completed,
    completionRate: expected === 0 ? null : completed / expected,
    trackedDays: elapsed.length,
    fullDays: elapsed.filter((day) => day.done === day.total).length,
    currentStreak: fullDayStreak({ templates, dailyTasks, today }),
  }
}

export function habitMonthView({
  templates,
  dailyTasks,
  month,
  today,
}: HabitMonthInput): HabitMonthView {
  return viewOfDates(templates, dailyTasks, monthDates(month), today)
}

/** The last `days` days up to today, shaped like a month view. */
export function habitWindowView({
  templates,
  dailyTasks,
  days,
  today,
}: {
  templates: TaskTemplate[]
  dailyTasks: DailyTask[]
  days: number
  today: ISODate
}): HabitMonthView {
  const from = addDaysToISODate(today, -(days - 1))
  return viewOfDates(templates, dailyTasks, datesBetween(from, today), today)
}

/** Current run of done days per habit, counted over the whole history. */
export function habitStreaks({
  templates,
  dailyTasks,
  today,
}: {
  templates: TaskTemplate[]
  dailyTasks: DailyTask[]
  today: ISODate
}): Map<ID, number> {
  const from = addDaysToISODate(today, -(MAX_DAYS_SCANNED - 1))
  return new Map(
    habitStats({ templates, dailyTasks, from, to: today, today }).map(
      (stat) => [stat.templateId, stat.currentStreak],
    ),
  )
}
