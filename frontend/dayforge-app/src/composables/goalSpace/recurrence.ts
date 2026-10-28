import type { RecurrenceRule } from '../../entities/RecurrenceEntity'
import type { TaskTemplate } from '../../entities/TaskEntity'
import type { ISODate } from '../../entities/types'
import {
  RECURRENCE_TYPE,
  TASK_KIND_BY_SCHEDULE,
} from '../../entities/constants'
import { daysBetweenISODates, weekdayOfISODate } from './date'

export type ScheduleKind =
  (typeof TASK_KIND_BY_SCHEDULE)[keyof typeof TASK_KIND_BY_SCHEDULE]

/**
 * Whether `date` is the day a month-based rule asks for. A rule day that the
 * month does not have (the 31st in April, the 29th in February of a common
 * year) falls on that month's last day, so the rule still fires every month
 * instead of being skipped in the short ones.
 */
export function fallsOnRuleDay(ruleDay: number, date: ISODate): boolean {
  const [year, month, day] = date.split('-').map(Number)
  if (day === ruleDay) return true
  // Day 0 of the next month is the last day of this one.
  const lastDay = new Date(year, month, 0).getDate()
  return day === lastDay && ruleDay > lastDay
}

export function matchesRecurrence(
  rule: RecurrenceRule,
  date: ISODate,
): boolean {
  if (date < rule.startDate) return false
  if (rule.endDate && date > rule.endDate) return false

  const interval = Math.max(1, rule.interval ?? 1)

  switch (rule.type) {
    case RECURRENCE_TYPE.NONE:
      return date === rule.startDate

    case RECURRENCE_TYPE.DAILY:
      return daysBetweenISODates(rule.startDate, date) % interval === 0

    case RECURRENCE_TYPE.WEEKLY: {
      const daysOfWeek = rule.daysOfWeek ?? []
      if (!daysOfWeek.length) return false
      return daysOfWeek.includes(weekdayOfISODate(date))
    }

    case RECURRENCE_TYPE.MONTHLY: {
      const daysOfMonth = rule.daysOfMonth ?? []
      if (!daysOfMonth.length) return false
      return daysOfMonth.some((ruleDay) => fallsOnRuleDay(ruleDay, date))
    }

    // Same month and day every year — birthdays and anniversaries. A 29 Feb
    // start falls on 28 Feb in a common year.
    case RECURRENCE_TYPE.YEARLY:
      return (
        date.slice(5, 7) === rule.startDate.slice(5, 7) &&
        fallsOnRuleDay(Number(rule.startDate.slice(8, 10)), date)
      )

    default:
      return false
  }
}

export function scheduleKindOf(template: TaskTemplate): ScheduleKind {
  if (!template.recurrence) return TASK_KIND_BY_SCHEDULE.OPEN

  if (
    template.recurrence.type === RECURRENCE_TYPE.NONE ||
    template.recurrence.type === RECURRENCE_TYPE.YEARLY
  ) {
    return TASK_KIND_BY_SCHEDULE.PLANNED
  }

  return TASK_KIND_BY_SCHEDULE.RECURRING
}

/** Whether the same planned task comes round again after its date passes. */
export function isAnnual(template: TaskTemplate): boolean {
  return template.recurrence?.type === RECURRENCE_TYPE.YEARLY
}

/**
 * The date a yearly rule lands on in `year`. A 29 February start falls on the
 * last day of February in a common year, the same fallback fallsOnRuleDay uses.
 */
function yearlyDateIn(startDate: ISODate, year: number): ISODate {
  const month = Number(startDate.slice(5, 7))
  const ruleDay = Number(startDate.slice(8, 10))
  const lastDay = new Date(year, month, 0).getDate()
  const day = String(Math.min(ruleDay, lastDay)).padStart(2, '0')
  return `${year}-${startDate.slice(5, 7)}-${day}` as ISODate
}

export function nextPlannedDateOf(
  template: TaskTemplate,
  today: ISODate,
): ISODate | null {
  if (scheduleKindOf(template) !== TASK_KIND_BY_SCHEDULE.PLANNED) return null

  const startDate = template.recurrence?.startDate
  if (!startDate) return null
  if (!isAnnual(template)) return startDate

  const thisYear = Number(today.slice(0, 4))
  const dueThisYear = yearlyDateIn(startDate, thisYear)

  return dueThisYear >= today
    ? dueThisYear
    : yearlyDateIn(startDate, thisYear + 1)
}

export function occursOn(template: TaskTemplate, date: ISODate): boolean {
  if (scheduleKindOf(template) === TASK_KIND_BY_SCHEDULE.OPEN) return false
  return matchesRecurrence(template.recurrence!, date)
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * The words a rule label is built from. The English set is the default, so the
 * pure function stays testable; the app passes the translated set.
 */
export interface RecurrenceWords {
  once: string
  daily: string
  every: (days: number) => string
  weekly: string
  weeklyOn: (days: string) => string
  monthly: string
  monthlyOn: (days: string) => string
  yearly: string
  repeats: string
  /** Short weekday name for 0 (Sunday) to 6 (Saturday). */
  weekday: (day: number) => string
}

export const ENGLISH_RECURRENCE_WORDS: RecurrenceWords = {
  once: 'Once',
  daily: 'Daily',
  every: (days) => `Every ${days} days`,
  weekly: 'Weekly',
  weeklyOn: (days) => `Weekly · ${days}`,
  monthly: 'Monthly',
  monthlyOn: (days) => `Monthly · day ${days}`,
  yearly: 'Every year',
  repeats: 'Repeats',
  weekday: (day) => WEEKDAY_SHORT[day],
}

/** Short rule label, e.g. "Daily", "Every 8 days", "Weekly · Mon, Wed". */
export function describeRecurrence(
  rule: RecurrenceRule,
  words: RecurrenceWords = ENGLISH_RECURRENCE_WORDS,
): string {
  const interval = Math.max(1, rule.interval ?? 1)

  switch (rule.type) {
    case RECURRENCE_TYPE.NONE:
      return words.once

    case RECURRENCE_TYPE.DAILY:
    case RECURRENCE_TYPE.CUSTOM:
      return interval > 1 ? words.every(interval) : words.daily

    case RECURRENCE_TYPE.WEEKLY: {
      const names = (rule.daysOfWeek ?? []).map((day) => words.weekday(day))
      return names.length ? words.weeklyOn(names.join(', ')) : words.weekly
    }

    case RECURRENCE_TYPE.MONTHLY: {
      const days = rule.daysOfMonth ?? []
      return days.length ? words.monthlyOn(days.join(', ')) : words.monthly
    }

    case RECURRENCE_TYPE.YEARLY:
      return words.yearly

    default:
      return words.repeats
  }
}

/** Whether a template produces more than one occurrence, so a tally means something. */
export function isRepeating(template: TaskTemplate): boolean {
  if (!template.recurrence) return false
  return template.recurrence.type !== RECURRENCE_TYPE.NONE
}
