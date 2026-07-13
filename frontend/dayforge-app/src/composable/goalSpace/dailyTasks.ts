import type { DailyTask, TaskTemplate } from '../../entities/TaskEntity'
import type { ID, ISODate } from '../../entities/types'
import { createId } from './date'

type EnsureDailyTaskParams = {
  taskTemplates: TaskTemplate[]
  dailyTasks: DailyTask[]
  template: TaskTemplate
  date: ISODate
}

export function ensureDailyTaskForTemplate(
  params: EnsureDailyTaskParams,
): DailyTask {
  const { taskTemplates, dailyTasks, template, date } = params

  const existing = dailyTasks.find(
    (task) => task.templateId === template.id && task.date === date,
  )
  if (existing) return existing

  let parentDailyTaskId: ID | undefined

  if (template.parentTemplateId) {
    const parentTemplate = taskTemplates.find(
      (task) => task.id === template.parentTemplateId,
    )
    if (parentTemplate) {
      parentDailyTaskId = ensureDailyTaskForTemplate({
        taskTemplates,
        dailyTasks,
        template: parentTemplate,
        date,
      }).id
    }
  }

  const dailyTask: DailyTask = {
    id: createId('daily'),
    date,
    goalId: template.goalId,
    templateId: template.id,
    title: template.title,
    priority: template.priority,
    parentDailyTaskId,
    tagIds: [...template.tagIds],
    status: 'todo',
  }

  dailyTasks.push(dailyTask)
  return dailyTask
}

export function findLastExistingDate(
  dailyTasks: DailyTask[],
  beforeDate: ISODate,
): ISODate | null {
  const uniqueDates = Array.from(new Set(dailyTasks.map((task) => task.date)))
    .filter((date) => date < beforeDate)
    .sort()
  return uniqueDates.length ? uniqueDates[uniqueDates.length - 1] : null
}

export function ensureTodaySnapshot(
  taskTemplates: TaskTemplate[],
  dailyTasks: DailyTask[],
  today: ISODate,
) {
  if (dailyTasks.some((task) => task.date === today)) return

  const activeTemplates = taskTemplates.filter((task) => task.isActive)
  const lastDate = findLastExistingDate(dailyTasks, today)

  if (!lastDate) {
    const sortedTemplates = [...taskTemplates].sort((a, b) => a.order - b.order)
    for (const template of sortedTemplates) {
      ensureDailyTaskForTemplate({
        taskTemplates: activeTemplates,
        dailyTasks,
        template,
        date: today,
      })
    }
    return
  }

  const majorTemplates = activeTemplates.filter(
    (task) => task.priority === 'major',
  )
  for (const template of majorTemplates) {
    ensureDailyTaskForTemplate({
      taskTemplates: activeTemplates,
      dailyTasks,
      template,
      date: today,
    })
  }

  const unfinishedMinors = dailyTasks.filter(
    (task) =>
      task.date === lastDate &&
      task.priority === 'minor' &&
      task.status !== 'done',
  )

  for (const minor of unfinishedMinors) {
    const template = activeTemplates.find(
      (task) => task.id === minor.templateId,
    )
    if (template) {
      ensureDailyTaskForTemplate({
        taskTemplates: activeTemplates,
        dailyTasks,
        template,
        date: today,
      })
    }
  }
}
