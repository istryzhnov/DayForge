import type { DailyTask, TaskTemplate } from '../../entities/TaskEntity'
import type { ID, ISODate } from '../../entities/types'
import { TASK_KIND_BY_SCHEDULE, TASK_STATUS } from '../../entities/constants'
import { createId, getTodayISODate } from './date'
import { occursOn, scheduleKindOf } from './recurrence'

/**
 * An open task is a single row that follows the user forward: if it was not
 * finished on an earlier day, it becomes today's. Without this an unfinished
 * task is stranded on the day it was created and silently disappears — and
 * creating a fresh row per day instead would pile up dead `todo` rows.
 *
 * Completed rows stay on the day they were completed, so history is intact.
 */
export function carryOpenTasksForward(
  taskTemplates: TaskTemplate[],
  dailyTasks: DailyTask[],
  today: ISODate,
) {
  const openTemplateIds = new Set(
    taskTemplates
      .filter(
        (template) =>
          scheduleKindOf(template) === TASK_KIND_BY_SCHEDULE.OPEN,
      )
      .map((template) => template.id),
  )

  dailyTasks.forEach((row) => {
    if (!openTemplateIds.has(row.templateId)) return
    if (row.status === TASK_STATUS.DONE) return
    if (row.date >= today) return
    row.date = today
  })
}

/**
 * Materialize every template that occurs on `date`.
 *
 * Deliberately not short-circuited on "the day already has rows": a task
 * scheduled ahead of time creates a single row for a future date, and bailing
 * out here would mean that when the user finally navigates to that day, every
 * other template is skipped and their day looks empty except for that one task.
 * `ensureDailyTaskForTemplate` is idempotent per template, so re-running is safe.
 */
export function ensureTodaySnapshot(
  taskTemplates: TaskTemplate[],
  dailyTasks: DailyTask[],
  date: ISODate,
) {
  const today = getTodayISODate()

  // Only when the user is actually on today — navigating back through history
  // must not drag unfinished work out of the past.
  if (date === today) {
    carryOpenTasksForward(taskTemplates, dailyTasks, today)
  }

  taskTemplates.forEach((template) => {
    const kind = scheduleKindOf(template)

    // An open task owns exactly one row for its whole life, wherever that row
    // currently sits; `occursOn` is false for it, so this is the only path that
    // can create one.
    if (kind === TASK_KIND_BY_SCHEDULE.OPEN) {
      if (date !== today) return
      const alreadyExists = dailyTasks.some(
        (row) => row.templateId === template.id,
      )
      if (alreadyExists) return
      ensureDailyTaskForTemplate({ taskTemplates, dailyTasks, template, date })
      return
    }

    if (!occursOn(template, date)) return
    ensureDailyTaskForTemplate({ taskTemplates, dailyTasks, template, date })
  })
}

export function ensureDailyTaskForTemplate({
  taskTemplates,
  dailyTasks,
  template,
  date,
}: {
  taskTemplates: TaskTemplate[]
  dailyTasks: DailyTask[]
  template: TaskTemplate
  date: ISODate
}) {
  const existing = dailyTasks.find(
    (task) => task.templateId === template.id && task.date === date,
  )
  if (existing) return

  let parentDailyTaskId: ID | undefined

  if (template.parentTemplateId) {
    const parentDailyTask = dailyTasks.find(
      (task) =>
        task.templateId === template.parentTemplateId && task.date === date,
    )

    if (parentDailyTask) {
      parentDailyTaskId = parentDailyTask.id
    } else {
      const parentTemplate = taskTemplates.find(
        (task) => task.id === template.parentTemplateId,
      )

      if (parentTemplate) {
        // Created regardless of the parent's own recurrence: a subtask on this
        // date needs a parent row to hang off.
        ensureDailyTaskForTemplate({
          taskTemplates,
          dailyTasks,
          template: parentTemplate,
          date,
        })

        parentDailyTaskId = dailyTasks.find(
          (task) =>
            task.templateId === template.parentTemplateId && task.date === date,
        )?.id
      }
    }
  }

  const newTask: DailyTask = {
    id: createId('daily-task') as ID,
    date,
    templateId: template.id,
    title: template.title,
    status: TASK_STATUS.TODO,
    priority: template.priority,
    goalId: template.goalId,
    parentDailyTaskId,
    tagIds: [],
    completedAt: undefined,
    // Each occurrence inherits the template's planned time, which is what puts
    // a repeating task on the calendar without any further action.
    startTime: template.startTime,
    endTime: template.endTime,
  }

  dailyTasks.push(newTask)
}
