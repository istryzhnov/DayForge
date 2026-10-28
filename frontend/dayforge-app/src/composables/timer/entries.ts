import type { ID, ISODate, ISODateTime } from '../../entities/types'
import type {
  TimeEntry,
  TimeEntryDraft,
  TimeEntrySource,
} from '../../entities/TimerEntity'
import { TIME_ENTRY_SOURCE } from '../../entities/constants'
import { toLocalISODate } from '../goalSpace/date'

/**
 * One problem with an entry. `text` is the English wording; the UI shows the
 * translation of `key` (a `timer.*` message) with `params` filled in.
 */
export interface IssueMessage {
  key: string
  text: string
  params?: { n: number }
}

export interface EntryIssues {
  /** Block saving: the entry would be nonsense. */
  errors: IssueMessage[]
  /** Worth knowing, but the user decides. */
  warnings: IssueMessage[]
}

export interface DayGroup {
  date: ISODate
  entries: TimeEntry[]
  totalMs: number
}

export function entryFromDraft(
  draft: TimeEntryDraft,
  id: ID,
  source: TimeEntrySource = TIME_ENTRY_SOURCE.TIMER,
): TimeEntry {
  return {
    id,
    sessionId: draft.sessionId,
    startedAt: new Date(draft.startedAt).toISOString(),
    endedAt: new Date(draft.endedAt).toISOString(),
    mode: draft.mode,
    phase: draft.phase,
    taskId: draft.task?.taskId,
    goalId: draft.task?.goalId,
    taskTitle: draft.task?.taskTitle,
    source,
    updatedAt: new Date().toISOString(),
  }
}

export function entryDurationMs(entry: TimeEntry): number {
  return Math.max(0, Date.parse(entry.endedAt) - Date.parse(entry.startedAt))
}

export function sumDurations(entries: TimeEntry[]): number {
  return entries.reduce((total, entry) => total + entryDurationMs(entry), 0)
}

/** Entries are filed under the day they started on, midnight crossings included. */
export function entryDate(entry: TimeEntry): ISODate {
  return toLocalISODate(new Date(entry.startedAt))
}

export function entriesByDay(entries: TimeEntry[]): Map<ISODate, TimeEntry[]> {
  const byDate = new Map<ISODate, TimeEntry[]>()

  entries.forEach((entry) => {
    const date = entryDate(entry)
    const group = byDate.get(date) ?? []
    group.push(entry)
    byDate.set(date, group)
  })

  return byDate
}

/** Tracked milliseconds per day, filed under the day each stretch began on. */
export function totalsByDay(entries: TimeEntry[]): Map<ISODate, number> {
  const totals = new Map<ISODate, number>()
  entriesByDay(entries).forEach((group, date) => {
    totals.set(date, sumDurations(group))
  })
  return totals
}

export function sortByStart(entries: TimeEntry[]): TimeEntry[] {
  return [...entries].sort(
    (a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt),
  )
}

export function findOverlaps(
  entry: Pick<TimeEntry, 'id' | 'startedAt' | 'endedAt'>,
  entries: TimeEntry[],
): TimeEntry[] {
  const start = Date.parse(entry.startedAt)
  const end = Date.parse(entry.endedAt)

  return entries.filter((other) => {
    if (other.id === entry.id) return false
    return (
      Date.parse(other.startedAt) < end && Date.parse(other.endedAt) > start
    )
  })
}

export function validateEntry(
  entry: Pick<TimeEntry, 'id' | 'startedAt' | 'endedAt'>,
  entries: TimeEntry[],
  now: number,
): EntryIssues {
  const errors: IssueMessage[] = []
  const warnings: IssueMessage[] = []

  const start = Date.parse(entry.startedAt)
  const end = Date.parse(entry.endedAt)

  if (Number.isNaN(start) || Number.isNaN(end)) {
    errors.push({
      key: 'timer.issueNeedBoth',
      text: 'Both a start and an end are needed.',
    })
    return { errors, warnings }
  }

  if (end <= start) {
    errors.push({
      key: 'timer.issueEndAfterStart',
      text: 'The end has to come after the start.',
    })
  }
  if (start > now) {
    errors.push({
      key: 'timer.issueStartFuture',
      text: 'That start is in the future.',
    })
  }
  if (end > now) {
    warnings.push({
      key: 'timer.issueEndFuture',
      text: 'This entry ends in the future.',
    })
  }

  const overlaps = findOverlaps(entry, entries)
  if (overlaps.length === 1) {
    warnings.push({
      key: 'timer.issueOverlapOne',
      text: 'Overlaps another entry.',
    })
  } else if (overlaps.length > 1) {
    warnings.push({
      key: 'timer.issueOverlapMany',
      text: `Overlaps ${overlaps.length} other entries.`,
      params: { n: overlaps.length },
    })
  }

  return { errors, warnings }
}

export function entriesOnDay(entries: TimeEntry[], date: ISODate): TimeEntry[] {
  return entries.filter((entry) => entryDate(entry) === date)
}

export function totalForTaskOnDate(
  entries: TimeEntry[],
  taskId: ID,
  date: ISODate,
): number {
  return sumDurations(
    entriesOnDay(entries, date).filter((entry) => entry.taskId === taskId),
  )
}

export function totalForDay(entries: TimeEntry[], date: ISODate): number {
  return sumDurations(entriesOnDay(entries, date))
}

export interface TaskTotal {
  /** Groups by task; entries left unattached fall into one bucket. */
  key: string
  taskId?: ID
  goalId?: ID
  title: string
  totalMs: number
  sessionCount: number
  lastAt: ISODateTime
}

const UNTRACKED_KEY = '__no_task__'

/** The bucket an entry lands in once grouped by task. */
export function taskTotalKey(
  entry: Pick<TimeEntry, 'taskId' | 'taskTitle'>,
): string {
  if (entry.taskId) return entry.taskId
  return entry.taskTitle ? `title:${entry.taskTitle}` : UNTRACKED_KEY
}

/**
 * How much time went into each task. Entries keep the title they were
 * recorded with, so a deleted task still accounts for its hours.
 */
export function totalsByTask(
  entries: TimeEntry[],
  sinceMs?: number,
  untitled = 'Without a task',
): TaskTotal[] {
  const totals = new Map<string, TaskTotal>()
  const sessions = new Map<string, Set<string>>()

  entries.forEach((entry) => {
    if (sinceMs !== undefined && Date.parse(entry.endedAt) < sinceMs) return

    const key = taskTotalKey(entry)
    const existing = totals.get(key)
    const sessionIds = sessions.get(key) ?? new Set<string>()
    sessionIds.add(entry.sessionId)
    sessions.set(key, sessionIds)

    if (!existing) {
      totals.set(key, {
        key,
        taskId: entry.taskId,
        goalId: entry.goalId,
        title: entry.taskTitle ?? untitled,
        totalMs: entryDurationMs(entry),
        sessionCount: 1,
        lastAt: entry.endedAt,
      })
      return
    }

    existing.totalMs += entryDurationMs(entry)
    // A renamed task is remembered by whatever it was called most recently.
    if (entry.endedAt > existing.lastAt) {
      existing.lastAt = entry.endedAt
      if (entry.taskTitle) existing.title = entry.taskTitle
    }
  })

  return [...totals.values()]
    .map((total) => ({
      ...total,
      sessionCount: sessions.get(total.key)?.size ?? 1,
    }))
    .sort((a, b) => b.totalMs - a.totalMs)
}

export function totalForTasks(entries: TimeEntry[], taskIds: ID[]): number {
  const wanted = new Set(taskIds)
  return sumDurations(
    entries.filter(
      (entry) => entry.taskId !== undefined && wanted.has(entry.taskId),
    ),
  )
}

export function groupByDay(entries: TimeEntry[]): DayGroup[] {
  return [...entriesByDay(sortByStart(entries))]
    .map(([date, group]) => ({
      date,
      entries: group,
      totalMs: sumDurations(group),
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function isReadableEntry(item: unknown): item is TimeEntry {
  if (typeof item !== 'object' || item === null) return false
  const entry = item as Partial<TimeEntry>
  return (
    typeof entry.id === 'string' &&
    typeof entry.startedAt === 'string' &&
    typeof entry.endedAt === 'string' &&
    !Number.isNaN(Date.parse(entry.startedAt)) &&
    !Number.isNaN(Date.parse(entry.endedAt))
  )
}

export function splitReadableEntries(input: unknown[]): {
  readable: TimeEntry[]
  unreadable: unknown[]
} {
  const readable: TimeEntry[] = []
  const unreadable: unknown[] = []
  input.forEach((item) => {
    if (isReadableEntry(item)) readable.push(item)
    else unreadable.push(item)
  })
  return { readable, unreadable }
}
