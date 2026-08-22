import type { ID, ISODate, TimeOfDay } from '../../entities/types'

export function createId(prefix: string): ID {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}` as ID
}

export function toLocalISODate(date: Date): ISODate {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}` as ISODate
}

export function getTodayISODate(): ISODate {
  return toLocalISODate(new Date())
}

export function addDaysToISODate(isoDate: ISODate, delta: number): ISODate {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + delta)
  return toLocalISODate(date)
}

export function parseISODate(isoDate: ISODate): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetweenISODates(from: ISODate, to: ISODate): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000
  // Compare at local midnight so daylight-saving shifts can't round a day off.
  const diffMs = parseISODate(to).getTime() - parseISODate(from).getTime()
  return Math.round(diffMs / MS_PER_DAY)
}

/** First day of the month `isoDate` falls in. */
export function startOfMonthISODate(isoDate: ISODate): ISODate {
  const [year, month] = isoDate.split('-').map(Number)
  return toLocalISODate(new Date(year, month - 1, 1))
}

/** Shift by whole months, clamping to the last valid day (Jan 31 + 1 → Feb 28). */
export function addMonthsToISODate(isoDate: ISODate, delta: number): ISODate {
  const [year, month, day] = isoDate.split('-').map(Number)
  const lastDayOfTarget = new Date(year, month - 1 + delta + 1, 0).getDate()
  return toLocalISODate(
    new Date(year, month - 1 + delta, Math.min(day, lastDayOfTarget)),
  )
}

/** Day of week in `Date.getDay()` terms: 0 = Sunday. */
export function weekdayOfISODate(isoDate: ISODate): number {
  return parseISODate(isoDate).getDay()
}

/** Shift an `hh:mm` time by minutes, clamped to the same day. */
export function addMinutesToTime(time: TimeOfDay, minutes: number): TimeOfDay {
  const [hours, mins] = time.split(':').map(Number)
  const total = Math.min(hours * 60 + mins + minutes, 23 * 60 + 59)
  const nextHours = Math.floor(total / 60)
  const nextMins = total % 60

  return `${String(nextHours).padStart(2, '0')}:${String(nextMins).padStart(2, '0')}`
}
