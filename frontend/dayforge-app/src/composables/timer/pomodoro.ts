import { POMODORO_PHASE } from '../../entities/constants'
import type { PomodoroPhase, TimerSettings } from '../../entities/TimerEntity'

export const MINUTE_MS = 60 * 1000

export const PHASE_LABELS: Record<PomodoroPhase, string> = {
  [POMODORO_PHASE.FOCUS]: 'Focus',
  [POMODORO_PHASE.SHORT_BREAK]: 'Short break',
  [POMODORO_PHASE.LONG_BREAK]: 'Long break',
}

export function phaseDurationMs(
  phase: PomodoroPhase,
  settings: TimerSettings,
): number {
  if (phase === POMODORO_PHASE.FOCUS) return settings.focusMinutes * MINUTE_MS
  if (phase === POMODORO_PHASE.LONG_BREAK) {
    return settings.longBreakMinutes * MINUTE_MS
  }
  return settings.shortBreakMinutes * MINUTE_MS
}

/** `completedFocusCount` already counts the focus phase that just ended. */
export function breakAfterFocus(
  completedFocusCount: number,
  settings: TimerSettings,
): PomodoroPhase {
  const every = Math.max(1, settings.longBreakEvery)
  return completedFocusCount % every === 0
    ? POMODORO_PHASE.LONG_BREAK
    : POMODORO_PHASE.SHORT_BREAK
}

/** Focus phases left before the next long break. */
export function focusesUntilLongBreak(
  completedFocusCount: number,
  settings: TimerSettings,
): number {
  const every = Math.max(1, settings.longBreakEvery)
  return every - (completedFocusCount % every)
}
