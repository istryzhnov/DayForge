import type { TimeEntry } from '../../../entities/TimerEntity'
import type { ID } from '../../../entities/types'
import {
  ANALYTICS_PERIOD,
  entriesInRange,
  periodRange,
} from '../../../composables/timer/analytics'
import { sumDurations } from '../../../composables/timer/entries'

/** Days the habit grid shows: 14 beside Upcoming, 28 when Upcoming is absent. */
export const HABIT_WINDOW_DAYS = { BESIDE_UPCOMING: 14, ALONE: 28 } as const

export function habitWindowDays(hasUpcoming: boolean): number {
  return hasUpcoming
    ? HABIT_WINDOW_DAYS.BESIDE_UPCOMING
    : HABIT_WINDOW_DAYS.ALONE
}

/** The numbers in the project header's stat row. */
export type PanelStats = {
  todayDone: number
  todayTotal: number
  /** Full days in a row; `null` hides the item when there are no habits. */
  streakDays: number | null
  trackedMs: number
}

/** Time booked this month, to one project or to all of them when `goalId` is null. */
export function monthTrackedMs(
  entries: TimeEntry[],
  goalId: ID | null,
  now: Date,
): number {
  const inMonth = entriesInRange(
    entries,
    periodRange(ANALYTICS_PERIOD.THIS_MONTH, now),
  )
  return sumDurations(
    inMonth.filter((entry) => goalId === null || entry.goalId === goalId),
  )
}
