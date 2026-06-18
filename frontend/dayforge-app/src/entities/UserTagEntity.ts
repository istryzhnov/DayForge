import type { ID, ISODateTime } from './types'

export interface UserTag {
  id: ID
  name: string
  color?: string
  createdAt: ISODateTime
}
