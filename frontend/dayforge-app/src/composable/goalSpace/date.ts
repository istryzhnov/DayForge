import type { ID, ISODate } from '../../entities/types'

export function createId(prefix: string): ID {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

export function getTodayISODate(): ISODate {
  return new Date().toISOString().slice(0, 10) as ISODate
}
