import type { Goal } from '../../../entities/GoalEntity'
import type { TimeEntry } from '../../../entities/TimerEntity'
import { entryDurationMs } from '../../../composables/timer/entries'
import { projectTotalKey } from '../../../composables/timer/analytics'
import {
  breakdownEarnings,
  rateForTask,
  type RateLookup,
} from '../../../composables/timer/rates'
import { projectFigures, sanitizeBilling, type ProjectFigures } from './projectBilling'

export interface ProjectEarning {
  /** Tracked time inside the period, before any manual-hours adjustment. */
  trackedMs: number
  /** The same adjusted figures the Analytics project table shows. */
  figures: ProjectFigures
}

export interface ProjectEarningsInput {
  /** Every entry ever recorded: the base a fixed price is pro-rated against. */
  allEntries: TimeEntry[]
  /** Entries inside the period being reported. */
  periodEntries: TimeEntry[]
  goals: Goal[]
  lookup: RateLookup
  isAllTime: boolean
}

function msByKey(entries: TimeEntry[]): Map<string, number> {
  const totals = new Map<string, number>()
  entries.forEach((entry) => {
    const key = projectTotalKey(entry)
    totals.set(key, (totals.get(key) ?? 0) + entryDurationMs(entry))
  })
  return totals
}

/**
 * Per-project earnings for one period, computed the way the Analytics project
 * table computes them: fixed prices and manual hours apply in All time, and a
 * fixed price is pro-rated by the period's share of tracked time otherwise.
 * Keys are goal ids, or NO_PROJECT_KEY for entries without a project.
 */
export function projectEarnings(
  input: ProjectEarningsInput,
): Map<string, ProjectEarning> {
  const { allEntries, periodEntries, goals, lookup, isAllTime } = input
  const goalById = new Map(goals.map((goal) => [goal.id, goal]))

  const periodMs = msByKey(periodEntries)
  const allMs = msByKey(allEntries)
  const periodEarned = breakdownEarnings(periodEntries, lookup).byProject
  const allEarned = breakdownEarnings(allEntries, lookup).byProject

  const keys = new Set(periodMs.keys())
  if (isAllTime) goals.forEach((goal) => keys.add(goal.id))

  const result = new Map<string, ProjectEarning>()
  keys.forEach((key) => {
    const goal = goalById.get(key)
    const trackedMs = periodMs.get(key) ?? 0

    const figures = projectFigures({
      periodMs: trackedMs,
      periodEarned: periodEarned.get(key) ?? 0,
      allTimeMs: allMs.get(key) ?? 0,
      allTimeEarned: allEarned.get(key) ?? 0,
      fallbackRate: rateForTask(lookup, undefined, goal?.id),
      isAllTime,
      billing: sanitizeBilling(goal?.billing),
    })

    result.set(key, { trackedMs, figures })
  })

  return result
}

/** Sum of the adjusted earnings in a projectEarnings result. */
export function totalEarned(earnings: Map<string, ProjectEarning>): number {
  let total = 0
  earnings.forEach((item) => {
    total += item.figures.earned
  })
  return total
}
