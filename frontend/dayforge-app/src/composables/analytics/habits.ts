import type { DailyTask, TaskTemplate } from '../../entities/TaskEntity'
import type { ID, ISODate } from '../../entities/types'
import { TASK_STATUS } from '../../entities/constants'
import { addDaysToISODate } from '../goalSpace/date'
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
