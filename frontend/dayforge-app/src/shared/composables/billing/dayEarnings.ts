import type { TimeEntry } from '../../../entities/TimerEntity'
import type { ID, ISODate } from '../../../entities/types'
import { earningsFor } from '../timer/analytics'
import { entryDate, entryDurationMs } from '../timer/entries'
import { rateForTask, type RateLookup } from '../timer/rates'

/**
 * Money earned per calendar day, priced one entry at a time with the same
 * task → project → default chain as Analytics. `goalId` narrows it to one
 * project; `null` counts every project.
 */
export function earningsByDate(
  entries: TimeEntry[],
  lookup: RateLookup,
  goalId: ID | null = null,
): Map<ISODate, number> {
  const byDate = new Map<ISODate, number>()
  entries.forEach((entry) => {
    if (goalId !== null && entry.goalId !== goalId) return
    const rate = rateForTask(lookup, entry.taskId, entry.goalId)
    if (rate <= 0) return
    const date = entryDate(entry)
    const earned = earningsFor(entryDurationMs(entry), rate)
    byDate.set(date, (byDate.get(date) ?? 0) + earned)
  })
  return byDate
}

/**
 * Whether money belongs on screen for this scope: some rate applies to it.
 * With no rate anywhere, a "$0" would only be noise.
 */
export function scopeHasRate(lookup: RateLookup, goalId: ID | null): boolean {
  if (lookup.defaultRate > 0 || lookup.byTask.size > 0) return true
  if (goalId === null) return lookup.byGoal.size > 0
  return lookup.byGoal.has(goalId)
}
