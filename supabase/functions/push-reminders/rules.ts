/*
  Server-side reminder decisions for Web Push.

  This is a port of the in-app rules in frontend/dayforge-app/src/composables/
  timer/reminders.ts and plannedBlocks.ts, written as pure functions so the
  Edge Function and the browser-side verify harness (tests/sync/compat.ts) can
  check them against each other. Keep the two in step: any rule change goes to
  both files, and compat.ts asserts the results agree.

  Nothing in here touches the network, the database or the clock. The caller
  passes in the time (as a Clock built in the caller's time zone) and the rows.

  Deliberate differences from the in-app rules:
  - Quiet hours apply to every server push, not only planned-start prompts.
  - The server cannot see the in-app "dismissed" list, so a block the user
    waved away in the app can still be pushed once.
  - No midnight-crossing push: the in-app midnight warning stays in the app.
*/

export type ReminderKind = 'long-run' | 'planned-start' | 'end-of-day'

export interface ReminderMessage {
  kind: ReminderKind
  /** Dedupe key, unique per user and kind: stored in push_log. */
  ref: string
  title: string
  body: string
  /** Same tag the in-app browser notification uses, so one replaces the other. */
  tag: string
  url: string
}

export interface ServerTimer {
  sessionId: string
  status: string
  /** Epoch ms the running stretch began; null unless running. */
  startedAt: number | null
  task?: { taskId?: string; goalId?: string; taskTitle?: string }
}

export interface ServerEntry {
  id?: string
  sessionId?: string
  taskId?: string
  /** ISO 8601 strings, as stored. */
  startedAt: string
  endedAt: string
}

export interface ServerTask {
  id: string
  templateId: string
  date: string
  title: string
  status: string
  startTime?: string
  endTime?: string
}

/** Everything a rule needs to know about "now", in the user's own time zone. */
export interface Clock {
  /** Epoch ms. */
  now: number
  /** The user's local `YYYY-MM-DD`. */
  today: string
  /** Minutes since the user's local midnight. */
  minutesOfDay: number
  /** Epoch ms of a local `YYYY-MM-DD` day at `HH:mm` in the user's zone. */
  localMs: (date: string, time: string) => number
}

export interface ServerSettings {
  notifications?: {
    plannedStartReminder?: unknown
    endOfDayNudge?: unknown
    endOfDayTime?: unknown
    quietHours?: unknown
    quietFrom?: unknown
    quietTo?: unknown
  }
  timer?: { longRunHours?: unknown }
}

export interface RuleInput {
  clock: Clock
  settings: ServerSettings | null
  timer: ServerTimer | null
  /** Entries that matter today, plus every stretch of the running sitting. */
  entries: ServerEntry[]
  /** Today's daily tasks, live rows only. */
  tasks: ServerTask[]
  /** Whether a reminder with this kind and ref was already sent. */
  wasSent: (kind: ReminderKind, ref: string) => boolean
}

// Mirrors the in-app defaults (useSettings.ts DEFAULT_SETTINGS).
const DEFAULTS = {
  plannedStartReminder: true,
  endOfDayNudge: true,
  endOfDayTime: '22:00',
  quietHours: false,
  quietFrom: '22:00',
  quietTo: '08:00',
  longRunHours: 3,
} as const

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
/** Matches PLANNED_START_GRACE_MS in timer/reminders.ts. */
export const PLANNED_START_GRACE_MS = 5 * MINUTE_MS

const LIVE_STATUSES = ['running', 'paused']
const RUNNING = 'running'
const DONE = 'done'

// ---- Pure helpers, same names and meaning as the client ------------------

export function isLongRunDue(runningMs: number, hours: number): boolean {
  return hours > 0 && runningMs >= hours * HOUR_MS
}

export function sittingRunningMs(
  entries: ServerEntry[],
  sessionId: string,
  currentStretchMs: number,
): number {
  let total = Math.max(0, currentStretchMs)
  for (const entry of entries) {
    if (entry.sessionId !== sessionId) continue
    total += Math.max(
      0,
      Date.parse(entry.endedAt) - Date.parse(entry.startedAt),
    )
  }
  return total
}

/** Whether the local clock has reached `HH:mm`, given minutes since midnight. */
export function isEndOfDayMinutes(minutesOfDay: number, nudgeTime: string): boolean {
  const [hours, minutes] = nudgeTime.split(':').map(Number)
  return minutesOfDay >= hours * 60 + minutes
}

export function isWithinQuietMinutes(
  minutesOfDay: number,
  from: string,
  to: string,
): boolean {
  const start = toMinutes(from)
  const end = toMinutes(to)
  if (start === end) return false
  return start < end
    ? minutesOfDay >= start && minutesOfDay < end
    : minutesOfDay >= start || minutesOfDay < end
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export interface PlannedBlock {
  templateId: string
  title: string
  date: string
  startTime?: string
  endTime?: string
}

export type BlockLogState = 'no-end' | 'not-finished' | 'logged' | 'loggable'

export function blockRange(
  block: PlannedBlock,
  localMs: Clock['localMs'],
): { startedAt: number; endedAt: number } | null {
  if (!block.startTime || !block.endTime) return null
  const startedAt = localMs(block.date, block.startTime)
  const endedAt = localMs(block.date, block.endTime)
  return endedAt > startedAt ? { startedAt, endedAt } : null
}

export function blockLogState(
  block: PlannedBlock,
  entries: ServerEntry[],
  now: number,
  localMs: Clock['localMs'],
): BlockLogState {
  const range = blockRange(block, localMs)
  if (!range) return 'no-end'
  if (range.endedAt > now) return 'not-finished'

  const overlapped = entries.some(
    (other) =>
      Date.parse(other.startedAt) < range.endedAt &&
      Date.parse(other.endedAt) > range.startedAt,
  )
  return overlapped ? 'logged' : 'loggable'
}

export function loggableCount(
  blocks: PlannedBlock[],
  entries: ServerEntry[],
  now: number,
  localMs: Clock['localMs'],
): number {
  return blocks.filter(
    (block) => blockLogState(block, entries, now, localMs) === 'loggable',
  ).length
}

function trackedSince(
  entries: ServerEntry[],
  templateId: string,
  sinceMs: number,
): boolean {
  return entries.some(
    (entry) =>
      entry.taskId === templateId && Date.parse(entry.endedAt) > sinceMs,
  )
}

/** Most recently started due block, as pickPlannedStart in plannedBlocks.ts. */
export function pickPlannedStart(
  tasks: ServerTask[],
  today: string,
  now: number,
  entries: ServerEntry[],
  localMs: Clock['localMs'],
  isSkipped: (task: ServerTask) => boolean,
): ServerTask | null {
  let best: { task: ServerTask; startMs: number } | null = null

  for (const task of tasks) {
    if (task.date !== today || !task.startTime) continue
    if (task.status === DONE) continue

    const startMs = localMs(today, task.startTime)
    if (now - startMs < PLANNED_START_GRACE_MS) continue
    if (isSkipped(task)) continue
    if (trackedSince(entries, task.templateId, startMs)) continue

    if (!best || startMs > best.startMs) best = { task, startMs }
  }

  return best?.task ?? null
}

export function plannedNudgeLabel(count: number): string {
  return count === 1
    ? '1 planned block today has no time logged'
    : `${count} planned blocks today have no time logged`
}

// ---- The decision ---------------------------------------------------------

/** Every reminder that is due now and not yet sent. Pure. */
export function decideReminders(input: RuleInput): ReminderMessage[] {
  const { clock, timer, entries, tasks, wasSent } = input
  const notifications = input.settings?.notifications ?? {}
  const timerSettings = input.settings?.timer ?? {}

  const plannedStart = asBool(notifications.plannedStartReminder, DEFAULTS.plannedStartReminder)
  const endOfDay = asBool(notifications.endOfDayNudge, DEFAULTS.endOfDayNudge)
  const endOfDayTime = asTime(notifications.endOfDayTime, DEFAULTS.endOfDayTime)
  const quiet =
    asBool(notifications.quietHours, DEFAULTS.quietHours) &&
    isWithinQuietMinutes(
      clock.minutesOfDay,
      asTime(notifications.quietFrom, DEFAULTS.quietFrom),
      asTime(notifications.quietTo, DEFAULTS.quietTo),
    )
  const longRunHours = asNumber(timerSettings.longRunHours, DEFAULTS.longRunHours)

  const out: ReminderMessage[] = []
  if (quiet) return out

  // Long run: the running sitting has crossed the threshold.
  if (
    longRunHours > 0 &&
    timer &&
    timer.status === RUNNING &&
    timer.startedAt !== null
  ) {
    const runningMs = sittingRunningMs(
      entries,
      timer.sessionId,
      clock.now - timer.startedAt,
    )
    const ref = `${timer.sessionId}:${longRunHours}`
    if (isLongRunDue(runningMs, longRunHours) && !wasSent('long-run', ref)) {
      const subject = timer.task?.taskTitle
        ? `Timer on "${timer.task.taskTitle}"`
        : 'The timer'
      out.push({
        kind: 'long-run',
        ref,
        title: 'DayForge timer',
        body: `${subject} has been running for ${longRunHours} h`,
        tag: `long-${timer.sessionId}`,
        url: '/',
      })
    }
  }

  // Planned start: a block began 5+ minutes ago and nothing is running.
  const timerLive = timer !== null && LIVE_STATUSES.includes(timer.status)
  if (plannedStart && !timerLive) {
    const task = pickPlannedStart(
      tasks,
      clock.today,
      clock.now,
      entries,
      clock.localMs,
      (candidate) => wasSent('planned-start', candidate.id),
    )
    if (task && task.startTime) {
      const minutes = Math.floor(
        (clock.now - clock.localMs(clock.today, task.startTime)) / MINUTE_MS,
      )
      out.push({
        kind: 'planned-start',
        ref: task.id,
        title: 'DayForge timer',
        body: `"${task.title}" started ${minutes} min ago`,
        tag: `planned-${task.id}`,
        url: '/',
      })
    }
  }

  // End of day: once a day, when the summary time has passed and finished
  // blocks still have no time logged.
  if (
    endOfDay &&
    isEndOfDayMinutes(clock.minutesOfDay, endOfDayTime) &&
    !wasSent('end-of-day', clock.today)
  ) {
    const blocks: PlannedBlock[] = tasks
      .filter((task) => task.date === clock.today)
      .map((task) => ({
        templateId: task.templateId,
        title: task.title,
        date: task.date,
        startTime: task.startTime,
        endTime: task.endTime,
      }))
    const count = loggableCount(blocks, entries, clock.now, clock.localMs)
    if (count > 0) {
      out.push({
        kind: 'end-of-day',
        ref: clock.today,
        title: 'DayForge',
        body: plannedNudgeLabel(count),
        tag: `end-of-day-${clock.today}`,
        url: '/',
      })
    }
  }

  return out
}

// ---- Coercion of stored, user-editable JSON -------------------------------

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

function asTime(value: unknown, fallback: string): string {
  return typeof value === 'string' && TIME_PATTERN.test(value) ? value : fallback
}
