import type { ActiveTimer, TimerMode } from '../../entities/TimerEntity'
import { TIMER_MODE, TIMER_STATUS } from '../../entities/constants'
import { createIdleTimer } from './machine'

export function isKnownTimerStatus(value: unknown): boolean {
  return Object.values(TIMER_STATUS).includes(value as ActiveTimer['status'])
}

export function sanitizeActiveTimer(input: unknown): ActiveTimer {
  if (typeof input !== 'object' || input === null) return createIdleTimer()

  const raw = input as Partial<ActiveTimer> & Record<string, unknown>
  const mode = Object.values(TIMER_MODE).includes(raw.mode as TimerMode)
    ? (raw.mode as TimerMode)
    : TIMER_MODE.STOPWATCH

  if (!isKnownTimerStatus(raw.status)) {
    return createIdleTimer(mode)
  }

  return {
    ...raw,
    sessionId: typeof raw.sessionId === 'string' ? raw.sessionId : '',
    mode,
    status: raw.status as ActiveTimer['status'],
    startedAt: typeof raw.startedAt === 'number' ? raw.startedAt : null,
    accumulatedMs:
      typeof raw.accumulatedMs === 'number' && raw.accumulatedMs >= 0
        ? raw.accumulatedMs
        : 0,
    durationMs:
      typeof raw.durationMs === 'number' && raw.durationMs > 0
        ? raw.durationMs
        : undefined,
    phase: raw.phase,
    completedFocusCount:
      typeof raw.completedFocusCount === 'number'
        ? raw.completedFocusCount
        : 0,
    task: raw.task,
  }
}
