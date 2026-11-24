import { DAY_WINDOW } from '../../../entities/constants'

/** Where the grid opens when no timed block is on screen and today is not. */
export const DEFAULT_START_HOUR = 8

export type StartHourInput = {
  /** Start of every timed block on screen, in minutes from midnight. */
  blockStartMinutes: readonly number[]
  /** True when today falls inside the day or week on screen. */
  rangeHasToday: boolean
  /** The current time, in minutes from midnight. */
  nowMinutes: number
}

/**
 * The whole hour the grid should scroll to when a day or week comes into view.
 * One hour above the earliest timed block, so the block is not on the top edge.
 * Without blocks, one hour above now when today is shown, otherwise 08:00.
 * Clamped to the hours the grid has, so it never points past its end.
 */
export function pickStartHour({
  blockStartMinutes,
  rangeHasToday,
  nowMinutes,
}: StartHourInput): number {
  if (blockStartMinutes.length === 0 && !rangeHasToday) {
    return DEFAULT_START_HOUR
  }

  const anchorMinutes =
    blockStartMinutes.length > 0 ? Math.min(...blockStartMinutes) : nowMinutes
  const hour = Math.floor(anchorMinutes / 60) - 1
  return Math.min(
    Math.max(hour, DAY_WINDOW.START_HOUR),
    DAY_WINDOW.END_HOUR - 1,
  )
}
