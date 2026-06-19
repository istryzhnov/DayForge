import type { RecurrenceRule } from './RecurrenceEntity'
import type { ID, ISODate, ISODateTime, Priority, TaskStatus } from './types'

export interface TaskTemplate {
  id: ID
  goalId: ID
  title: string
  notes?: string
  priority: Priority
  parentTemplateId?: ID
  order: number
  tagIds: ID[]
  recurrence?: RecurrenceRule
  isActive: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface DailyTask {
  id: ID
  date: ISODate
  goalId: ID
  templateId: ID
  title: string
  priority: Priority
  parentDailyTaskId?: ID
  tagIds: ID[]
  status: TaskStatus
  completedAt?: ISODateTime
}

export interface DailyProgress {
  date: ISODate
  goalId?: ID
  totalTasks: number
  completedTasks: number
  completionPercent: number
}

export type CreateTaskInput =
  | {
      kind: 'task'
      goalId: ID
      title: string
      priority?: Priority
    }
  | {
      kind: 'subtask'
      parentTemplateId: ID
      title: string
      priority?: Priority
    }

export const TASK_KIND = {
  TASK: 'task',
  SUBTASK: 'subtask',
} as const

export type TaskKind = (typeof TASK_KIND)[keyof typeof TASK_KIND]
