import type { GoalStatus, ID, ISODateTime } from './types'

export interface Goal {
  id: ID
  userId: ID
  title: string
  description?: string
  status: GoalStatus
  createdAt: ISODateTime
  updatedAt: ISODateTime
}
