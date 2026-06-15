import type { RecurrenceRule } from './RepeatEntity'
import type { ID, ISODate, Priority, TaskStatus } from './types'

export interface TaskTemplate {
  id: ID
  goalId: ID
  title: string
  notes?: string
  priority: Priority
  parentTaskId?: ID
  order: number
  tagIds: ID[]
  recurrence?: RecurrenceRule
  isArchived: boolean
  createdAt: string
  updatedAt: string
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
  completedAt?: string
}

export interface DailyProgress {
  date: ISODate
  goalId?: ID
  totalMinor: number
  completedMinor: number
  completionPercent: number
}
