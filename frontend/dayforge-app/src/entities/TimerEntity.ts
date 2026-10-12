import type { ID, ISODateTime } from './types'
import {
  POMODORO_PHASE,
  TIMER_MODE,
  TIMER_STATUS,
  TIME_ENTRY_SOURCE,
} from './constants'

export type TimerMode = (typeof TIMER_MODE)[keyof typeof TIMER_MODE]
export type TimerStatus = (typeof TIMER_STATUS)[keyof typeof TIMER_STATUS]
export type PomodoroPhase =
  (typeof POMODORO_PHASE)[keyof typeof POMODORO_PHASE]
export type TimeEntrySource =
  (typeof TIME_ENTRY_SOURCE)[keyof typeof TIME_ENTRY_SOURCE]

/** Snapshot of the task a timer runs on, so history survives its deletion. */
export interface TimerTaskRef {
  /** The template id: a repeating task has one row per day but one template. */
  taskId: ID
  goalId?: ID
  taskTitle: string
}

export interface ActiveTimer {
  sessionId: ID
  mode: TimerMode
  status: TimerStatus
  /** Epoch ms the current running stretch began; null unless running. */
  startedAt: number | null
  /** Milliseconds banked by earlier stretches of the same phase. */
  accumulatedMs: number
  /** Planned length of a countdown or of the current pomodoro phase. */
  durationMs?: number
  phase?: PomodoroPhase
  /** Focus phases finished so far, deciding when a long break is due. */
  completedFocusCount: number
  task?: TimerTaskRef
}

export interface TimeEntry {
  id: ID
  /** Shared by every stretch of one sitting, split apart by pauses. */
  sessionId: ID
  startedAt: ISODateTime
  endedAt: ISODateTime
  mode: TimerMode
  phase?: PomodoroPhase
  taskId?: ID
  goalId?: ID
  taskTitle?: string
  source: TimeEntrySource
  note?: string
  updatedAt: ISODateTime
  /** Set only on a buried copy; an entry in the live list never carries it. */
  deletedAt?: ISODateTime
}

/** What the machine hands back on a closed stretch, before it gets an id. */
export interface TimeEntryDraft {
  sessionId: ID
  startedAt: number
  endedAt: number
  mode: TimerMode
  phase?: PomodoroPhase
  task?: TimerTaskRef
}

export interface TimerSettings {
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  /** A long break replaces the short one after this many focus phases. */
  longBreakEvery: number
  autoStartBreaks: boolean
  autoStartFocus: boolean
  defaultCountdownMinutes: number
  sound: boolean
  /** What an hour of tracked time is worth; 0 keeps money out of the way. */
  hourlyRate: number
  currency: string
}
