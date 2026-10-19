import type { DailyTask, TaskTemplate } from '../../../entities/TaskEntity'
import type { ID, ISODate, TimeOfDay } from '../../../entities/types'
import { TASK_STATUS } from '../../../entities/constants'
import { addDaysToISODate } from '../../../composables/goalSpace/date'
import {
  describeRecurrence,
  isRepeating,
  occursOn,
} from '../../../composables/goalSpace/recurrence'

export const UPCOMING_WINDOW_DAYS = 14

export type UpcomingItem = {
  key: string
  templateId: ID
  title: string
  goalId?: ID
  date: ISODate
  startTime?: TimeOfDay
  endTime?: TimeOfDay
  isDone: boolean
  /** Set only for repeating tasks, e.g. "Daily" or "Every 8 days". */
  repeatLabel?: string
}

export type UpcomingDay = {
  date: ISODate
  items: UpcomingItem[]
}

/**
 * Tasks that fall on the days after `fromDate`, grouped by date. Covers rows
 * that already exist and repeats projected from their rule, the same way the
 * calendar does: a row wins over a projection of its own task on that day. A
 * repeating task is listed only once, at its first date inside the window.
 *
 * `goalId` narrows the list to one project; `null` means every project.
 */
export function collectUpcoming(
  templates: TaskTemplate[],
  dailyTasks: DailyTask[],
  fromDate: ISODate,
  days: number = UPCOMING_WINDOW_DAYS,
  goalId: ID | null,
): UpcomingDay[] {
  const activeTemplates = templates.filter((template) => template.isActive)
  const templateById = new Map(
    activeTemplates.map((template) => [template.id, template]),
  )

  const windowEnd = addDaysToISODate(fromDate, days)
  const rowsByDate = new Map<ISODate, DailyTask[]>()
  dailyTasks.forEach((row) => {
    if (!templateById.has(row.templateId)) return
    if (row.date <= fromDate || row.date > windowEnd) return
    const bucket = rowsByDate.get(row.date)
    if (bucket) bucket.push(row)
    else rowsByDate.set(row.date, [row])
  })

  const listedRepeats = new Set<ID>()
  const result: UpcomingDay[] = []

  for (let offset = 1; offset <= days; offset += 1) {
    const date = addDaysToISODate(fromDate, offset)
    const rows = rowsByDate.get(date) ?? []
    const materialized = new Set<ID>(rows.map((row) => row.templateId))

    const found: UpcomingItem[] = [
      ...rows.map((row) => ({
        key: row.id,
        templateId: row.templateId,
        title: row.title,
        goalId: row.goalId,
        date,
        startTime: row.startTime,
        endTime: row.endTime,
        isDone: row.status === TASK_STATUS.DONE,
      })),
      ...activeTemplates
        .filter((template) => !materialized.has(template.id))
        .filter((template) => occursOn(template, date))
        .map((template) => ({
          key: `${template.id}@${date}`,
          templateId: template.id,
          title: template.title,
          goalId: template.goalId,
          date,
          startTime: template.startTime,
          endTime: template.endTime,
          isDone: false,
        })),
    ]

    const items: UpcomingItem[] = []

    found
      .filter((item) => goalId === null || item.goalId === goalId)
      .sort((a, b) =>
        (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99'),
      )
      .forEach((item) => {
        const template = templateById.get(item.templateId)
        const repeat =
          template && isRepeating(template) ? template.recurrence : undefined

        if (repeat) {
          if (listedRepeats.has(item.templateId)) return
          listedRepeats.add(item.templateId)
        }

        items.push({
          ...item,
          repeatLabel: repeat ? describeRecurrence(repeat) : undefined,
        })
      })

    if (items.length) result.push({ date, items })
  }

  return result
}
