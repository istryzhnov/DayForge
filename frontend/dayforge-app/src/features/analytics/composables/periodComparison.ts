import type { PeriodRange } from '../../../shared/composables/timer/analytics'
import { TASK_STATUS } from '../../../entities/constants'

/**
 * The window of the same length that ends where `range` starts. "This month"
 * on the 23rd is compared with the 23 days before the 1st. All time has no
 * start, so it has no previous period.
 */
export function previousRange(range: PeriodRange): PeriodRange | null {
  if (range.from === null) return null
  const length = range.to - range.from
  return { from: range.from - length, to: range.from }
}

/** Relative change in whole percent. Null when there is nothing to compare against. */
export function percentChange(
  current: number,
  previous: number,
): number | null {
  if (!(previous > 0)) return null
  return Math.round(((current - previous) / previous) * 100)
}

/** Tasks ticked off whose completion falls inside the range. */
export function tasksDoneIn(
  tasks: { status: string; completedAt?: string }[],
  range: PeriodRange,
): number {
  return tasks.filter((task) => {
    if (task.status !== TASK_STATUS.DONE || !task.completedAt) return false
    const at = Date.parse(task.completedAt)
    if (Number.isNaN(at)) return false
    if (range.from !== null && at < range.from) return false
    return at < range.to
  }).length
}

export interface PeriodFigures {
  trackedMs: number
  earned: number
  tasksDone: number
}

export interface PeriodDeltas {
  /** Percent change of tracked time, or null without a previous period. */
  trackedPct: number | null
  /** Percent change of earnings, or null without a previous period or earnings. */
  earnedPct: number | null
  /** Difference in finished tasks (can be negative). Null without a previous period. */
  tasksDone: number | null
}

export function comparePeriods(
  current: PeriodFigures,
  previous: PeriodFigures | null,
): PeriodDeltas {
  if (!previous) return { trackedPct: null, earnedPct: null, tasksDone: null }
  return {
    trackedPct: percentChange(current.trackedMs, previous.trackedMs),
    earnedPct: percentChange(current.earned, previous.earned),
    tasksDone: current.tasksDone - previous.tasksDone,
  }
}
