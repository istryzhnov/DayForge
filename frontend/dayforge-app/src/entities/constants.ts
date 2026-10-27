export const PRIORITY = {
  MAJOR: 'major',
  MINOR: 'minor',
} as const

export const TASK_KIND = {
  TASK: 'task',
  SUBTASK: 'subtask',
} as const

export const TASK_STATUS = {
  TODO: 'todo',
  DONE: 'done',
  SKIPPED: 'skipped',
} as const

/** The open columns of a project board. "Done" is the task's own done status. */
export const BOARD_STAGE = {
  TODO: 'todo',
  DOING: 'doing',
} as const

export type BoardStage = (typeof BOARD_STAGE)[keyof typeof BOARD_STAGE]

export const GOAL_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  ARCHIVED: 'archived',
} as const

export const PROGRESS_SCOPE_TYPE = {
  ALL: 'all',
  GOAL: 'goal',
  MAJOR: 'major',
} as const

export const RECURRENCE_TYPE = {
  NONE: 'none',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  CUSTOM: 'custom',
} as const

export const TASK_KIND_BY_SCHEDULE = {
  /** No date, no repeat — carries forward to today until done. */
  OPEN: 'open',
  /** Pinned to one date. */
  PLANNED: 'planned',
  /** Follows a repeat rule. */
  RECURRING: 'recurring',
} as const

export const TIMER_MODE = {
  STOPWATCH: 'stopwatch',
  COUNTDOWN: 'countdown',
  POMODORO: 'pomodoro',
} as const

export const TIMER_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  /** A countdown or pomodoro phase ran out and the next one waits for a start. */
  FINISHED: 'finished',
} as const

export const POMODORO_PHASE = {
  FOCUS: 'focus',
  SHORT_BREAK: 'shortBreak',
  LONG_BREAK: 'longBreak',
} as const

export const TIME_ENTRY_SOURCE = {
  TIMER: 'timer',
  MANUAL: 'manual',
} as const

export const DAY_WINDOW = {
  START_HOUR: 0,
  END_HOUR: 24,
} as const

// Curated swatches offered in the per-goal color picker.
export const GOAL_COLOR_PRESETS = [
  '#73ff44',
  '#ff7a2f',
  '#23c7eb',
  '#f2c94c',
  '#ff5d8f',
  '#9b6bff',
] as const
