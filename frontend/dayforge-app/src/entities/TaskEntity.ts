import type { RecurrenceRule } from './RepeatEntity'
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
  totalMinor: number
  completedMinor: number
  completionPercent: number
}
