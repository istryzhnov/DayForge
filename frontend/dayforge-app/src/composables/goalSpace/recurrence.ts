import type { RecurrenceRule } from '../../entities/RecurrenceEntity'
import type { TaskTemplate } from '../../entities/TaskEntity'
import type { ISODate } from '../../entities/types'
import { RECURRENCE_TYPE, TASK_KIND_BY_SCHEDULE } from '../../entities/constants'
import { daysBetweenISODates, weekdayOfISODate } from './date'

export type ScheduleKind =
  (typeof TASK_KIND_BY_SCHEDULE)[keyof typeof TASK_KIND_BY_SCHEDULE]

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

    // Same month and day every year — birthdays and anniversaries.
    case RECURRENCE_TYPE.YEARLY:
      return date.slice(5) === rule.startDate.slice(5)

    default:
      return false
  }
}

/**
 * How a template relates to the calendar — the axis that decides where it is
 * listed and which days it can appear on.
 *
 * - `open`: no date, no repeat. One row that carries forward to today until it
 *   is done. Never projected onto other days.
 * - `planned`: pinned to a single date (a dentist appointment, a birthday).
 * - `recurring`: follows its rule for as long as the rule runs.
 */
export function scheduleKindOf(template: TaskTemplate): ScheduleKind {
  if (!template.recurrence) return TASK_KIND_BY_SCHEDULE.OPEN

  // A yearly rule is a dated commitment that simply comes round again — a
  // birthday belongs beside the dentist appointment, not in today's work list.
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
 * The date a planned task is next due.
 *
 * One-offs keep their original date even once it has passed — that is what
 * makes them overdue. An annual one rolls to the next time it comes round.
 */
export function nextPlannedDateOf(
  template: TaskTemplate,
  today: ISODate,
): ISODate | null {
  if (scheduleKindOf(template) !== TASK_KIND_BY_SCHEDULE.PLANNED) return null

  const startDate = template.recurrence?.startDate
  if (!startDate) return null
  if (!isAnnual(template)) return startDate

  const monthDay = startDate.slice(5)
  const thisYear = today.slice(0, 4)
  const dueThisYear = `${thisYear}-${monthDay}` as ISODate

  return dueThisYear >= today
    ? dueThisYear
    : (`${Number(thisYear) + 1}-${monthDay}` as ISODate)
}

/**
 * Whether a template should be snapshotted onto `date`.
 *
 * Open tasks answer `false` for every date: they are not occurrences, they are
 * a single row that rolls forward, so projecting them would put an unfinished
 * task on every future day forever.
 */
export function occursOn(template: TaskTemplate, date: ISODate): boolean {
  if (scheduleKindOf(template) === TASK_KIND_BY_SCHEDULE.OPEN) return false
  return matchesRecurrence(template.recurrence!, date)
}

/** Whether a template produces more than one occurrence, so a tally means something. */
export function isRepeating(template: TaskTemplate): boolean {
  if (!template.recurrence) return false
  return template.recurrence.type !== RECURRENCE_TYPE.NONE
}
