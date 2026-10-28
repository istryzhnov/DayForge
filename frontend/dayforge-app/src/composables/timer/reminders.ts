import type { TimeEntry } from '../../entities/TimerEntity'
import type { ID } from '../../entities/types'
import { toLocalISODate } from '../goalSpace/date'
import { MINUTE_MS } from './pomodoro'

const HOUR_MS = 60 * MINUTE_MS

/** 0 switches the long-run reminder off. */
export const LONG_RUN_HOUR_OPTIONS = [0, 1, 2, 3, 4, 6, 8] as const
/** 0 switches the away prompt off. */
export const IDLE_RETURN_MINUTE_OPTIONS = [0, 10, 15, 30, 60] as const

/** How long after a block's start it counts as started without a timer. */
export const PLANNED_START_GRACE_MS = 5 * MINUTE_MS

type Sitting = Pick<TimeEntry, 'sessionId' | 'startedAt' | 'endedAt'>

/**
 * Time the sitting has actually run: every stretch it already recorded, plus the
 * one still running. Pauses are not part of it.
 */
export function sittingRunningMs(
  entries: Sitting[],
  sessionId: ID,
  currentStretchMs: number,
): number {
  let total = Math.max(0, currentStretchMs)
  for (const entry of entries) {
    if (entry.sessionId !== sessionId) continue
    total += Math.max(
      0,
      Date.parse(entry.endedAt) - Date.parse(entry.startedAt),
    )
  }
  return total
}

/** Earliest moment the sitting began, from its recorded stretches or the running one. */
export function sittingStartMs(
  entries: Sitting[],
  sessionId: ID,
  runningStartMs: number,
): number {
  let earliest = runningStartMs
  for (const entry of entries) {
    if (entry.sessionId !== sessionId) continue
    earliest = Math.min(earliest, Date.parse(entry.startedAt))
  }
  return earliest
}

export function isLongRunDue(runningMs: number, hours: number): boolean {
  return hours > 0 && runningMs >= hours * HOUR_MS
}

/** The sitting began on an earlier local day than `now`. */
export function crossedMidnight(sittingStart: number, now: number): boolean {
  return (
    toLocalISODate(new Date(sittingStart)) !== toLocalISODate(new Date(now))
  )
}

export function isAwayLongEnough(awayMs: number, idleMinutes: number): boolean {
  return idleMinutes > 0 && awayMs >= idleMinutes * MINUTE_MS
}

export interface AwaySplit {
  /** Where the stretch that was running keeps its time; null if none of it is kept. */
  keptEndsAt: number | null
  /** Where a fresh stretch picks up once the away time is cut out. */
  resumeAt: number
}

/**
 * Cuts the away window [hiddenAt, returnedAt] out of a running stretch that
 * began at `startedAt`. Only the part before the tab was hidden survives.
 */
export function splitStretchAroundAway(
  startedAt: number,
  hiddenAt: number,
  returnedAt: number,
): AwaySplit {
  return {
    keptEndsAt: hiddenAt > startedAt ? hiddenAt : null,
    resumeAt: Math.max(returnedAt, hiddenAt),
  }
}

export interface AwayTimeWords {
  hours: string
  minutes: string
  lessThanMinute: string
}

const ENGLISH_AWAY_WORDS: AwayTimeWords = {
  hours: 'h',
  minutes: 'min',
  lessThanMinute: 'less than a minute',
}

/** "1 h 20 min", "45 min", "1 h". The words default to English. */
export function formatAwayTime(
  ms: number,
  words: AwayTimeWords = ENGLISH_AWAY_WORDS,
): string {
  const totalMinutes = Math.floor(Math.max(0, ms) / MINUTE_MS)
  if (totalMinutes < 1) return words.lessThanMinute

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} ${words.minutes}`
  if (minutes === 0) return `${hours} ${words.hours}`
  return `${hours} ${words.hours} ${minutes} ${words.minutes}`
}

/** Whether the local clock has reached the end-of-day nudge time (`HH:mm`). */
export function isEndOfDay(date: Date, nudgeTime: string): boolean {
  const [hours, minutes] = nudgeTime.split(':').map(Number)
  const now = date.getHours() * 60 + date.getMinutes()
  return now >= hours * 60 + minutes
}

export function plannedNudgeLabel(count: number): string {
  return count === 1
    ? '1 planned block today has no time logged'
    : `${count} planned blocks today have no time logged`
}
