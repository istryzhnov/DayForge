import type { DailyTask, TaskTemplate } from '../../../entities/TaskEntity'
import type { ID, ISODate, Priority, TimeOfDay } from '../../../entities/types'
import { TASK_STATUS } from '../../../entities/constants'
import { occursOn } from '../../../composables/goalSpace/recurrence'
import { durationMinutes } from './useCalendarGrid'

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

export function collectDayEvents({
  templates,
  rowsByDate,
  date,
}: {
  templates: TaskTemplate[]
  rowsByDate: Map<ISODate, DailyTask[]>
  date: ISODate
}): DayEvent[] {
  const rows = rowsByDate.get(date) ?? []
  const materializedTemplateIds = new Set<ID>(rows.map((row) => row.templateId))

  const events: DayEvent[] = rows.map((row) => ({
    key: row.id,
    title: row.title,
    goalId: row.goalId,
    startTime: row.startTime,
    endTime: row.endTime,
    priority: row.priority,
    isDone: row.status === TASK_STATUS.DONE,
    isProjected: false,
  }))

  templates.forEach((template) => {
    if (materializedTemplateIds.has(template.id)) return
    if (!occursOn(template, date)) return

    events.push({
      key: `${template.id}@${date}`,
      title: template.title,
      goalId: template.goalId,
      startTime: template.startTime,
      endTime: template.endTime,
      priority: template.priority,
      isDone: false,
      isProjected: true,
    })
  })

  return events.sort((a, b) =>
    (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99'),
  )
}

/** Total booked minutes for a day — the "how loaded am I" number. */
export function scheduledMinutesOf(events: DayEvent[]): number {
  return events.reduce(
    (total, event) =>
      event.startTime
        ? total + durationMinutes(event.startTime, event.endTime)
        : total,
    0,
  )
}
