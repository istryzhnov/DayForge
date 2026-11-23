/** Lead times a task can be given, in minutes before its start. */
export const TASK_REMINDER_OPTIONS = [5, 10, 15, 30, 60] as const

const MAX_REMINDER_MINUTES = 24 * 60

/**
 * Reads a stored `reminderMinutes`. Anything that is not null or a sensible
 * whole number of minutes is treated as absent, so old and damaged data fall
 * back to the global lead instead of breaking a reminder.
 */
export function normalizeReminderMinutes(
  value: unknown,
): number | null | undefined {
  if (value === null) return null
  if (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= MAX_REMINDER_MINUTES
  ) {
    return Math.round(value)
  }
  return undefined
}

/**
 * The lead, in ms, a task's reminder uses. Absent follows the global lead,
 * null means no reminder at all (returned as null).
 */
export function reminderLeadMs(
  reminderMinutes: number | null | undefined,
  globalLeadMs: number,
): number | null {
  if (reminderMinutes === null) return null
  if (reminderMinutes === undefined) return globalLeadMs
  return reminderMinutes * 60 * 1000
}

/**
 * What a reminder picker holds: follow the global lead ('default'), no
 * reminder (null), or this many minutes before the start.
 */
export type ReminderChoice = 'default' | null | number

/** Order a tap goes through: default, the preset leads, then off. */
export const REMINDER_CHOICE_CYCLE: readonly ReminderChoice[] = [
  'default',
  ...TASK_REMINDER_OPTIONS,
  null,
]

export function reminderChoiceOf(
  reminderMinutes: number | null | undefined,
): ReminderChoice {
  return reminderMinutes === undefined ? 'default' : reminderMinutes
}

/** The stored value for a choice: undefined leaves the field out. */
export function reminderMinutesOf(
  choice: ReminderChoice,
): number | null | undefined {
  return choice === 'default' ? undefined : choice
}

export function nextReminderChoice(choice: ReminderChoice): ReminderChoice {
  const index = REMINDER_CHOICE_CYCLE.indexOf(choice)
  return REMINDER_CHOICE_CYCLE[(index + 1) % REMINDER_CHOICE_CYCLE.length]
}
