import type { ID, ISODate } from '../../entities/types'

export function createId(prefix: string): ID {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}` as ID
}

export function getTodayISODate(): ISODate {
  return new Date().toISOString().slice(0, 10) as ISODate
}
