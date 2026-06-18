import type { ID, ISODateTime } from './types'

export interface UserTag {
  id: ID
  userId: ID
  name: string
  color?: string
  createdAt: ISODateTime
}
