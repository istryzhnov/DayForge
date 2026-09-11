import type { DailyTask, TaskTemplate } from '../../entities/TaskEntity'
import type { ID, ISODate } from '../../entities/types'
import { TASK_KIND_BY_SCHEDULE, TASK_STATUS } from '../../entities/constants'
import { createId, getTodayISODate } from './date'
import { occursOn, scheduleKindOf } from './recurrence'
import { useSettings } from '../useSettings'

export function carryOpenTasksForward(
  taskTemplates: TaskTemplate[],
  dailyTasks: DailyTask[],
  today: ISODate,
) {
  const openTemplateIds = new Set(
    taskTemplates
      .filter(
        (template) => scheduleKindOf(template) === TASK_KIND_BY_SCHEDULE.OPEN,
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

export function ensureTodaySnapshot(
  taskTemplates: TaskTemplate[],
  dailyTasks: DailyTask[],
  date: ISODate,
) {
  const today = getTodayISODate()

  if (date === today && useSettings().settings.behavior.carryForward) {
    carryOpenTasksForward(taskTemplates, dailyTasks, today)
  }

  taskTemplates.forEach((template) => {
    const kind = scheduleKindOf(template)

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
    startTime: template.startTime,
    endTime: template.endTime,
  }

  dailyTasks.push(newTask)
}
