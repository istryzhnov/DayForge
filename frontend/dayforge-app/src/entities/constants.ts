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

export const MAJOR_DECISION = {
  CONTINUE: 'continue',
  DONE: 'done',
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
  CUSTOM: 'custom',
} as const

// A repeating task stops generating occurrences after this many days. Snapshots
// are created lazily per visited day, so this caps how far a rule can ever grow
// localStorage.
export const RECURRENCE_HORIZON_DAYS = 30

// The planning day window. Times outside it have nowhere to render on the
// calendar grid, so schedule inputs are constrained to it too.
export const DAY_WINDOW = {
  START_HOUR: 6,
  END_HOUR: 23,
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
