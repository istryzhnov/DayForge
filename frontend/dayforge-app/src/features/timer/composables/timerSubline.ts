import type {
  ActiveTimer,
  TimeEntry,
  TimerTaskRef,
} from '../../../entities/TimerEntity'
import type { ID } from '../../../entities/types'
import {
  isRecorded,
  isRunning,
} from '../../../shared/composables/timer/machine'
import { earningsFor } from '../../../shared/composables/timer/analytics'
import {
  breakdownEarnings,
  rateForTask,
  type RateLookup,
} from '../../../shared/composables/timer/rates'

/**
 * Milliseconds of the running stretch that no entry holds yet. Pausing, stopping
 * or finishing saves a stretch as an entry, so only the live one is counted here.
 * Pomodoro breaks are never recorded, so they add nothing.
 */
export function liveStretchMs(timer: ActiveTimer, now: number): number {
  if (!isRunning(timer) || timer.startedAt === null) return 0
  if (!isRecorded(timer.mode, timer.phase)) return 0
  return Math.max(0, now - timer.startedAt)
}

/**
 * Money earned in the current sitting: every saved stretch of the sitting
 * priced at its own task's rate, plus the live stretch at the attached task's
 * rate. Returns 0 when nothing is priced.
 */
export function sessionEarned(input: {
  entries: TimeEntry[]
  sessionId: ID
  liveMs: number
  task?: TimerTaskRef
  lookup: RateLookup
}): number {
  const { entries, sessionId, liveMs, task, lookup } = input
  const saved = sessionId
    ? entries.filter((entry) => entry.sessionId === sessionId)
    : []
  const savedEarned = breakdownEarnings(saved, lookup).total
  const liveRate = rateForTask(lookup, task?.taskId, task?.goalId)
  return savedEarned + earningsFor(liveMs, liveRate)
}

/** The rate that applies to the attached task, 0 when none is set. */
export function taskRate(lookup: RateLookup, task?: TimerTaskRef): number {
  return rateForTask(lookup, task?.taskId, task?.goalId)
}

/** A rate reads "$45" or "$45.5": up to two decimals, none forced. */
export function formatRate(
  amount: number,
  locale: string,
  currency: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

/** Earned money always carries cents and a "+", as in the mockup: "+$31.70". */
export function formatEarned(
  amount: number,
  locale: string,
  currency: string,
): string {
  const money = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
  return `+${money}`
}
