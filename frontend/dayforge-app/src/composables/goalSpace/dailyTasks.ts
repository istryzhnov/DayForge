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
  void taskTemplates
  const existing = dailyTasks.find(
    (task) => task.templateId === template.id && task.date === date,
  )
  if (existing) return

  const newTask: DailyTask = {
    id: createId('daily-task') as ID,
    date,
    templateId: template.id,
    title: template.title,
    status: 'todo',
    priority: template.priority,
    goalId: template.goalId,
    parentDailyTaskId: undefined,
    majorDecision: undefined,
    tagIds: [],
    completedAt: undefined,
  }

  dailyTasks.push(newTask)
}
