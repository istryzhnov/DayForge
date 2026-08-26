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

export function occursOn(template: TaskTemplate, date: ISODate): boolean {
  if (scheduleKindOf(template) === TASK_KIND_BY_SCHEDULE.OPEN) return false
  return matchesRecurrence(template.recurrence!, date)
}

/** Whether a template produces more than one occurrence, so a tally means something. */
export function isRepeating(template: TaskTemplate): boolean {
  if (!template.recurrence) return false
  return template.recurrence.type !== RECURRENCE_TYPE.NONE
}
