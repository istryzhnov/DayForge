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

// Curated swatches offered in the per-goal color picker.
export const GOAL_COLOR_PRESETS = [
  '#73ff44',
  '#ff7a2f',
  '#23c7eb',
  '#f2c94c',
  '#ff5d8f',
  '#9b6bff',
] as const
