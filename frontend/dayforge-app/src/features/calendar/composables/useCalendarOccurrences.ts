import type { DailyTask, TaskTemplate } from '../../../entities/TaskEntity'
import type { ID, ISODate, Priority, TimeOfDay } from '../../../entities/types'
import { TASK_STATUS } from '../../../entities/constants'
import { addDaysToISODate } from '../../../composables/goalSpace/date'
import { occursOn } from '../../../composables/goalSpace/recurrence'
import {
  isOvernight,
  segmentForDay,
} from '../../../composables/goalSpace/overnight'
import { durationMinutes as spanMinutes } from '../../../composables/goalSpace/overnight'

export type DayEvent = {
  key: string
  title: string
  /** Which project it belongs to, so its colour can travel with it. */
  goalId?: ID
  startTime?: TimeOfDay
  endTime?: TimeOfDay
  priority: Priority
  isDone: boolean
  /** No row exists yet — projected from the template's recurrence rule. */
  isProjected: boolean
}

/** Rows bucketed by date, so callers build it once for a whole month or week. */
export function groupRowsByDate(rows: DailyTask[]): Map<ISODate, DailyTask[]> {
  const byDate = new Map<ISODate, DailyTask[]>()

  rows.forEach((row) => {
    const bucket = byDate.get(row.date)
    if (bucket) bucket.push(row)
    else byDate.set(row.date, [row])
  })

  return byDate
}

/** The times a block shows on `date`: its part of the day when it runs past midnight. */
function timesOn(
  date: ISODate,
  block: { date: ISODate; startTime?: TimeOfDay; endTime?: TimeOfDay },
) {
  const segment = segmentForDay(date, block)
  if (segment) return { startTime: segment.startTime, endTime: segment.endTime }
  return { startTime: block.startTime, endTime: block.endTime }
}

/**
 * The events of one day. A task that runs past midnight shows its start on its
 * own day and its tail on the next one. The tail is the same row, so ticking it
 * off on either day is one tick.
 */
export function collectDayEvents({
  templates,
  rowsByDate,
  date,
}: {
  templates: TaskTemplate[]
  rowsByDate: Map<ISODate, DailyTask[]>
  date: ISODate
}): DayEvent[] {
  const previousDate = addDaysToISODate(date, -1)
  const rows = rowsByDate.get(date) ?? []
  const previousRows = rowsByDate.get(previousDate) ?? []
  const materializedTemplateIds = new Set<ID>(rows.map((row) => row.templateId))
  const materializedPreviousIds = new Set<ID>(
    previousRows.map((row) => row.templateId),
  )

  const events: DayEvent[] = rows.map((row) => ({
    key: row.id,
    title: row.title,
    goalId: row.goalId,
    ...timesOn(date, row),
    priority: row.priority,
    isDone: row.status === TASK_STATUS.DONE,
    isProjected: false,
  }))

  previousRows.forEach((row) => {
    if (!segmentForDay(date, row)?.continuesFromPrevious) return
    events.push({
      key: `${row.id}@tail`,
      title: row.title,
      goalId: row.goalId,
      ...timesOn(date, row),
      priority: row.priority,
      isDone: row.status === TASK_STATUS.DONE,
      isProjected: false,
    })
  })

  templates.forEach((template) => {
    if (!materializedTemplateIds.has(template.id) && occursOn(template, date)) {
      events.push({
        key: `${template.id}@${date}`,
        title: template.title,
        goalId: template.goalId,
        ...timesOn(date, { ...template, date }),
        priority: template.priority,
        isDone: false,
        isProjected: true,
      })
    }

    // Tail of a rule that ran yesterday, shown before its row exists.
    if (
      isOvernight(template.startTime, template.endTime) &&
      !materializedPreviousIds.has(template.id) &&
      occursOn(template, previousDate)
    ) {
      const block = { ...template, date: previousDate }
      if (!segmentForDay(date, block)?.continuesFromPrevious) return
      events.push({
        key: `${template.id}@${previousDate}@tail`,
        title: template.title,
        goalId: template.goalId,
        ...timesOn(date, block),
        priority: template.priority,
        isDone: false,
        isProjected: true,
      })
    }
  })

  return events.sort((a, b) =>
    (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99'),
  )
}

/**
 * Total booked minutes for a day — the "how loaded am I" number. A block with
 * a start but no end counts the calendar's default length.
 */
export function scheduledMinutesOf(
  events: DayEvent[],
  defaultMinutes: number,
): number {
  return events.reduce((total, event) => {
    if (!event.startTime) return total
    const minutes = event.endTime
      ? spanMinutes(event.startTime, event.endTime)
      : defaultMinutes
    return total + minutes
  }, 0)
}
