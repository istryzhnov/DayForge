// Single source of truth for domain literal values.
// Import these instead of typing raw strings ('minor', 'done', etc.) to avoid typos.

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

// How a task relates to the calendar. Derived from its recurrence rule rather
// than stored, so there is one source of truth.
export const TASK_KIND_BY_SCHEDULE = {
  /** No date, no repeat — carries forward to today until done. */
  OPEN: 'open',
  /** Pinned to one date. */
  PLANNED: 'planned',
  /** Follows a repeat rule. */
  RECURRING: 'recurring',
} as const

// The planning day window. Times outside it have nowhere to render on the
// calendar grid, so schedule inputs are constrained to it too.
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
