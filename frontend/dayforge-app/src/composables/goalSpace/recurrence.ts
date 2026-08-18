import type { RecurrenceRule } from '../../entities/RecurrenceEntity'
import type { TaskTemplate } from '../../entities/TaskEntity'
import type { ISODate } from '../../entities/types'
import {
  RECURRENCE_HORIZON_DAYS,
  RECURRENCE_TYPE,
} from '../../entities/constants'
import {
  addDaysToISODate,
  daysBetweenISODates,
  weekdayOfISODate,
} from './date'

/**
 * Does a rule produce an occurrence on `date`?
 *
 * ISO date strings compare correctly with `<`/`>` because they are
 * zero-padded and big-endian, so the window checks need no parsing.
 */
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
      return daysOfMonth.includes(Number(date.split('-')[2]))
    }

    default:
      return false
  }
}

/**
 * Whether a template should be snapshotted onto `date`.
 *
 * A template with no rule occurs every day — that is what every task did before
 * scheduling existed, so pre-existing templates keep their behavior untouched.
 */
export function occursOn(template: TaskTemplate, date: ISODate): boolean {
  if (!template.recurrence) return true
  return matchesRecurrence(template.recurrence, date)
}

/** Last date a repeating rule may produce an occurrence on. */
export function recurrenceHorizonEnd(startDate: ISODate): ISODate {
  return addDaysToISODate(startDate, RECURRENCE_HORIZON_DAYS)
}
