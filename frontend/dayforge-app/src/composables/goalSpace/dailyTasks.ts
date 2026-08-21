import type { DailyTask, TaskTemplate } from '../../entities/TaskEntity'
import type { ID, ISODate } from '../../entities/types'
import { TASK_STATUS } from '../../entities/constants'
import { createId } from './date'
import { occursOn } from './recurrence'

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
  taskTemplates.forEach((template) => {
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
    majorDecision: undefined,
    tagIds: [],
    completedAt: undefined,
    // Each occurrence inherits the template's planned time, which is what puts
    // a repeating task on the calendar without any further action.
    startTime: template.startTime,
    endTime: template.endTime,
  }

  dailyTasks.push(newTask)
}
