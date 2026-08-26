
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

export const DAY_WINDOW = {
  START_HOUR: 0,
  END_HOUR: 24,
} as const

export const DEFAULT_TASK_DURATION_MINUTES = 60

// Curated swatches offered in the per-goal color picker.
export const GOAL_COLOR_PRESETS = [
  '#73ff44',
  '#ff7a2f',
  '#23c7eb',
  '#f2c94c',
  '#ff5d8f',
  '#9b6bff',
] as const
