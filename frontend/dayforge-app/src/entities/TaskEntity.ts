import type { RecurrenceRule } from './RecurrenceEntity'
import type {
  ID,
  ISODate,
  ISODateTime,
  Priority,
  TaskStatus,
  TimeOfDay,
} from './types'
import { TASK_KIND } from './constants'
import type { DailyFieldGroup } from '../sync/merge'

export interface TaskTemplate {
  id: ID
  goalId?: ID
  title: string
  notes?: string
  priority: Priority
  parentTemplateId?: ID
  order: number
  tagIds: ID[]
  recurrence?: RecurrenceRule
  startTime?: TimeOfDay
  endTime?: TimeOfDay
  isActive: boolean
  /** What an hour on this task is worth; falls back to its project's rate. */
  hourlyRate?: number
  createdAt: ISODateTime
  updatedAt: ISODateTime
  /** Set only on a buried copy; a task in the live list never carries it. */
  deletedAt?: ISODateTime

  day?: ISODate
  status?: TaskStatus
  completedAt?: ISODateTime
}

/** Optional scheduling captured while creating a task. */
export type TaskSchedule = {
  date: ISODate
  startTime?: TimeOfDay
  endTime?: TimeOfDay
  recurrence: RecurrenceRule
}

export interface DailyTask {
  /** `templateId::date` — derived, so the same day cannot be created twice. */
  id: ID
  date: ISODate
  goalId?: ID
  templateId: ID
  title: string
  priority: Priority
  parentDailyTaskId?: ID
  tagIds: ID[]
  status: TaskStatus
  completedAt?: ISODateTime
  startTime?: TimeOfDay
  endTime?: TimeOfDay
  createdAt?: ISODateTime
  /** Last edit, so two devices can tell which version of a row is newer. */
  updatedAt?: ISODateTime
  /**
   * When each independently edited group of fields last changed. Ticking a task
   * off on the phone and moving it in the calendar on the laptop are two
   * different edits, and one row stamp cannot keep them both.
   */
  fieldsAt?: Partial<Record<DailyFieldGroup, ISODateTime>>
  /** Set only on a buried copy; a row in the live list never carries it. */
  deletedAt?: ISODateTime
}

export type MajorTaskOption = {
  id: ID
  title: string
  goalId?: ID
  goalTitle: string
}

export type CreateTaskInput =
  | {
      kind: typeof TASK_KIND.TASK
      goalId?: ID
      title: string
      priority?: Priority
      schedule?: TaskSchedule
    }
  | {
      kind: typeof TASK_KIND.SUBTASK
      parentTemplateId: ID
      title: string
      priority?: Priority
      schedule?: TaskSchedule
    }
