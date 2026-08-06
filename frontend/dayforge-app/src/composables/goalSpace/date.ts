import type { ID, ISODate } from '../../entities/types'

export function createId(prefix: string): ID {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}` as ID
}

function toLocalISODate(date: Date): ISODate {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}` as ISODate
}

export function getTodayISODate(): ISODate {
  return toLocalISODate(new Date())
}
