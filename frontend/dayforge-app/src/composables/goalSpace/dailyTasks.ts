import type { DailyTask, TaskTemplate } from '../../entities/TaskEntity'
import type { ID, ISODate } from '../../entities/types'
import { createId } from './date'

export function ensureTodaySnapshot(
  taskTemplates: TaskTemplate[],
  dailyTasks: DailyTask[],
  date: ISODate,
) {
  const todayTasks = dailyTasks.filter((task) => task.date === date)
  if (todayTasks.length > 0) return

  taskTemplates.forEach((template) => {
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
      (task) => task.templateId === template.parentTemplateId && task.date === date,
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
          (task) => task.templateId === template.parentTemplateId && task.date === date,
        )?.id
      }
    }
  }

  const newTask: DailyTask = {
    id: createId('daily-task') as ID,
    date,
    templateId: template.id,
    title: template.title,
    status: 'todo',
    priority: template.priority,
    goalId: template.goalId,
    parentDailyTaskId,
    majorDecision: undefined,
    tagIds: [],
    completedAt: undefined,
  }

  dailyTasks.push(newTask)
}
