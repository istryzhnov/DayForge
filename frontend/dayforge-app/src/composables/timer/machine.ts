import type { ID } from '../../entities/types'
import type {
  ActiveTimer,
  PomodoroPhase,
  TimeEntryDraft,
  TimerMode,
  TimerSettings,
  TimerTaskRef,
} from '../../entities/TimerEntity'
import {
  POMODORO_PHASE,
  TIMER_MODE,
  TIMER_STATUS,
} from '../../entities/constants'
import { breakAfterFocus, MINUTE_MS, phaseDurationMs } from './pomodoro'

export type TimerAction =
  | {
      type: 'start'
      sessionId: ID
      mode: TimerMode
      task?: TimerTaskRef
      durationMs?: number
      /** Epoch ms to date the sitting from, when it is backdated; defaults to now. */
      startedAt?: number
    }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'stop' }
  | { type: 'finish' }
  | { type: 'skipPhase' }

export type TimerEffect = {
  type: 'phaseFinished'
  mode: TimerMode
  /** The phase that just ended, for pomodoro. */
  phase?: PomodoroPhase
  /** What the timer moved on to, if anything is queued. */
  nextPhase?: PomodoroPhase
  autoStarted: boolean
}

export interface TransitionResult {
  timer: ActiveTimer
  entries: TimeEntryDraft[]
  effects: TimerEffect[]
}

export function createIdleTimer(
  mode: TimerMode = TIMER_MODE.STOPWATCH,
): ActiveTimer {
  return {
    sessionId: '',
    mode,
    status: TIMER_STATUS.IDLE,
    startedAt: null,
    accumulatedMs: 0,
    completedFocusCount: 0,
  }
}

export function isRunning(timer: ActiveTimer): boolean {
  return timer.status === TIMER_STATUS.RUNNING && timer.startedAt !== null
}

export function isLive(timer: ActiveTimer): boolean {
  return (
    timer.status === TIMER_STATUS.RUNNING ||
    timer.status === TIMER_STATUS.PAUSED
  )
}

export function elapsedMs(timer: ActiveTimer, now: number): number {
  const live = isRunning(timer) ? Math.max(0, now - (timer.startedAt ?? now)) : 0
  return timer.accumulatedMs + live
}

/** Null for a stopwatch, which has nothing to count down to. */
export function remainingMs(
  timer: ActiveTimer,
  now: number,
): number | null {
  if (timer.durationMs === undefined) return null
  return Math.max(0, timer.durationMs - elapsedMs(timer, now))
}

/** Epoch ms the running countdown or phase is due to end. */
export function endsAt(timer: ActiveTimer): number | null {
  if (!isRunning(timer) || timer.durationMs === undefined) return null
  return (timer.startedAt ?? 0) + (timer.durationMs - timer.accumulatedMs)
}

export function hasExpired(timer: ActiveTimer, now: number): boolean {
  const end = endsAt(timer)
  return end !== null && now >= end
}

/** 0–1 through the current countdown or phase; 0 while a stopwatch runs. */
export function progress(timer: ActiveTimer, now: number): number {
  if (!timer.durationMs) return 0
  return Math.min(1, elapsedMs(timer, now) / timer.durationMs)
}

/** Breaks are deliberately left out of the history. */
export function isRecorded(
  mode: TimerMode,
  phase: PomodoroPhase | undefined,
): boolean {
  if (mode !== TIMER_MODE.POMODORO) return true
  return phase === POMODORO_PHASE.FOCUS
}

/** Every stretch that actually ran is kept, however short. */
function draftFor(timer: ActiveTimer, endedAt: number): TimeEntryDraft[] {
  if (!isRunning(timer)) return []
  if (!isRecorded(timer.mode, timer.phase)) return []

  const startedAt = timer.startedAt ?? endedAt
  if (endedAt <= startedAt) return []

  return [
    {
      sessionId: timer.sessionId,
      startedAt,
      endedAt,
      mode: timer.mode,
      phase: timer.phase,
      task: timer.task,
    },
  ]
}

function startedTimer(
  action: Extract<TimerAction, { type: 'start' }>,
  now: number,
  settings: TimerSettings,
): ActiveTimer {
  const base: ActiveTimer = {
    sessionId: action.sessionId,
    mode: action.mode,
    status: TIMER_STATUS.RUNNING,
    startedAt: action.startedAt ?? now,
    accumulatedMs: 0,
    completedFocusCount: 0,
    task: action.task,
  }

  if (action.mode === TIMER_MODE.COUNTDOWN) {
    return {
      ...base,
      durationMs:
        action.durationMs ?? settings.defaultCountdownMinutes * MINUTE_MS,
    }
  }

  if (action.mode === TIMER_MODE.POMODORO) {
    return {
      ...base,
      phase: POMODORO_PHASE.FOCUS,
      durationMs: phaseDurationMs(POMODORO_PHASE.FOCUS, settings),
    }
  }

  return base
}

/**
 * Ends the current countdown or phase at `endedAt` and queues what follows.
 * A queued phase is either already running (auto-start) or waiting on the
 * user, which is what `finished` means.
 */
function finishAt(
  timer: ActiveTimer,
  endedAt: number,
  settings: TimerSettings,
): TransitionResult {
  const entries = draftFor(timer, endedAt)

  if (timer.mode !== TIMER_MODE.POMODORO) {
    return {
      timer: {
        ...timer,
        status: TIMER_STATUS.FINISHED,
        startedAt: null,
        accumulatedMs: timer.durationMs ?? timer.accumulatedMs,
      },
      entries,
      effects: [
        { type: 'phaseFinished', mode: timer.mode, autoStarted: false },
      ],
    }
  }

  const wasFocus = timer.phase === POMODORO_PHASE.FOCUS
  const completedFocusCount = timer.completedFocusCount + (wasFocus ? 1 : 0)
  const nextPhase = wasFocus
    ? breakAfterFocus(completedFocusCount, settings)
    : POMODORO_PHASE.FOCUS
  const autoStart = wasFocus ? settings.autoStartBreaks : settings.autoStartFocus

  return {
    timer: {
      ...timer,
      status: autoStart ? TIMER_STATUS.RUNNING : TIMER_STATUS.FINISHED,
      startedAt: autoStart ? endedAt : null,
      accumulatedMs: 0,
      phase: nextPhase,
      durationMs: phaseDurationMs(nextPhase, settings),
      completedFocusCount,
    },
    entries,
    effects: [
      {
        type: 'phaseFinished',
        mode: timer.mode,
        phase: timer.phase,
        nextPhase,
        autoStarted: autoStart,
      },
    ],
  }
}

function silent(timer: ActiveTimer): TransitionResult {
  return { timer, entries: [], effects: [] }
}

export function transition(
  timer: ActiveTimer,
  action: TimerAction,
  now: number,
  settings: TimerSettings,
): TransitionResult {
  switch (action.type) {
    case 'start': {
      const closing = isLive(timer)
        ? transition(timer, { type: 'stop' }, now, settings)
        : silent(timer)

      return {
        timer: startedTimer(action, now, settings),
        entries: closing.entries,
        effects: closing.effects,
      }
    }

    case 'pause': {
      if (!isRunning(timer)) return silent(timer)
      return {
        timer: {
          ...timer,
          status: TIMER_STATUS.PAUSED,
          startedAt: null,
          accumulatedMs: elapsedMs(timer, now),
        },
        entries: draftFor(timer, now),
        effects: [],
      }
    }

    case 'resume': {
      if (timer.status === TIMER_STATUS.PAUSED) {
        return silent({
          ...timer,
          status: TIMER_STATUS.RUNNING,
          startedAt: now,
        })
      }
      // A finished pomodoro holds the next phase, waiting to be started.
      if (
        timer.status === TIMER_STATUS.FINISHED &&
        timer.mode === TIMER_MODE.POMODORO
      ) {
        return silent({
          ...timer,
          status: TIMER_STATUS.RUNNING,
          startedAt: now,
          accumulatedMs: 0,
        })
      }
      return silent(timer)
    }

    case 'stop': {
      const entries = draftFor(timer, now)
      return {
        timer: { ...createIdleTimer(timer.mode), task: timer.task },
        entries,
        effects: [],
      }
    }

    case 'finish': {
      if (timer.durationMs === undefined) return silent(timer)
      if (timer.status !== TIMER_STATUS.RUNNING) return silent(timer)
      return finishAt(timer, endsAt(timer) ?? now, settings)
    }

    case 'skipPhase': {
      if (timer.mode !== TIMER_MODE.POMODORO) return silent(timer)
      if (timer.status === TIMER_STATUS.IDLE) return silent(timer)
      return finishAt(timer, now, settings)
    }
  }
}

const CATCH_UP_LIMIT = 500

/**
 * Replays every phase that elapsed while the tab was closed. Each finished
 * phase is dated by its own end, not by the moment the tab came back.
 */
export function catchUp(
  timer: ActiveTimer,
  now: number,
  settings: TimerSettings,
): TransitionResult {
  let current = timer
  const entries: TimeEntryDraft[] = []
  const effects: TimerEffect[] = []

  for (let step = 0; step < CATCH_UP_LIMIT; step += 1) {
    if (!hasExpired(current, now)) break
    const result = transition(current, { type: 'finish' }, now, settings)
    current = result.timer
    entries.push(...result.entries)
    effects.push(...result.effects)
  }

  return { timer: current, entries, effects }
}
