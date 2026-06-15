import type { ISODate } from './types'

export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom'

export interface RecurrenceRule {
  type: RepeatType
  interval?: number // кожні N днів/тижнів/місяців
  daysOfWeek?: number[] // 0..6, якщо weekly/custom
  daysOfMonth?: number[] // 1..31, якщо monthly/custom
  startDate: ISODate
  endDate?: ISODate
}
