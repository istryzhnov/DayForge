import type { ISODate, TimeOfDay } from '../../entities/types'
import { addDaysToISODate } from './date'

export const MINUTES_PER_DAY = 24 * 60

/** The end of the day as a time: the part of a block that stops at midnight. */
const END_OF_DAY: TimeOfDay = '24:00'

type Timed = {
  date: ISODate
  startTime?: TimeOfDay
  endTime?: TimeOfDay
}

/** One day's share of a block: what the calendar draws and the plan counts. */
export type DaySegment = {
  startTime: TimeOfDay
  endTime?: TimeOfDay
  /** The block began the day before, so this is its tail. */
  continuesFromPrevious: boolean
  /** The block carries on into the next day. */
  continuesNextDay: boolean
}

/** `hh:mm` as minutes after midnight. */
function minutesOfTime(time: TimeOfDay): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * A block runs past midnight when it ends earlier than it starts: 22:00 to
 * 07:00 ends the next morning. The end is never a day of its own, so a block
 * can only reach into the next day. Equal times are not a block at all.
 */
export function isOvernight(startTime?: TimeOfDay, endTime?: TimeOfDay) {
  if (!startTime || !endTime) return false
  return minutesOfTime(endTime) < minutesOfTime(startTime)
}

/**
 * Length of a block in minutes, never negative. A block that runs past
 * midnight counts the hours before midnight plus the hours after it. Zero when
 * either end is missing or the two times are equal.
 */
export function durationMinutes(startTime?: TimeOfDay, endTime?: TimeOfDay) {
  if (!startTime || !endTime) return 0
  const span = minutesOfTime(endTime) - minutesOfTime(startTime)
  return span < 0 ? span + MINUTES_PER_DAY : span
}

/**
 * The part of a block that falls on `date`. The block's own day is `task.date`:
 * it holds [start, 24:00) there and [00:00, end) on the day after. Null when the
 * block does not touch `date`, has no start, or ends exactly at midnight (so
 * there is nothing left for the next day).
 */
export function segmentForDay(date: ISODate, task: Timed): DaySegment | null {
  const { startTime, endTime } = task
  if (!startTime) return null

  if (!isOvernight(startTime, endTime)) {
    if (date !== task.date) return null
    return {
      startTime,
      endTime,
      continuesFromPrevious: false,
      continuesNextDay: false,
    }
  }

  if (date === task.date) {
    return {
      startTime,
      endTime: END_OF_DAY,
      continuesFromPrevious: false,
      continuesNextDay: true,
    }
  }

  if (date === addDaysToISODate(task.date, 1) && minutesOfTime(endTime!) > 0) {
    return {
      startTime: '00:00',
      endTime,
      continuesFromPrevious: true,
      continuesNextDay: false,
    }
  }

  return null
}

/**
 * Rows to list on `date`: the rows of that day, plus the overnight rows of the
 * day before. A block that runs past midnight stays one occurrence, so its
 * tail shows on the next day as the same row, with the same done state.
 */
export function rowsShownOn<T extends Timed>(rows: T[], date: ISODate): T[] {
  const previousDate = addDaysToISODate(date, -1)
  return rows.filter(
    (row) =>
      row.date === date ||
      (row.date === previousDate && isOvernight(row.startTime, row.endTime)),
  )
}
