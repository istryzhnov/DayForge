import type { ISODate } from './types'
import type { RECURRENCE_TYPE } from './constants'

export type RecurrenceType =
  (typeof RECURRENCE_TYPE)[keyof typeof RECURRENCE_TYPE]

export interface RecurrenceRule {
  type: RecurrenceType
  interval?: number // кожні N днів/тижнів/місяців
  daysOfWeek?: number[] // 0..6 у форматі Date.getDay() (0 = неділя)
  daysOfMonth?: number[] // 1..31, якщо monthly/custom
  startDate: ISODate
  endDate?: ISODate
}
