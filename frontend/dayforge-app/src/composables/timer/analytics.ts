import type { ID, ISODate } from '../../entities/types'
import type { TimeEntry } from '../../entities/TimerEntity'
import { toLocalISODate } from '../goalSpace/date'
import { entryDurationMs, entryDate, totalsByTask, type TaskTotal } from './entries'

export const ANALYTICS_PERIOD = {
  THIS_MONTH: 'thisMonth',
  LAST_MONTH: 'lastMonth',
  THIS_WEEK: 'thisWeek',
  ALL: 'all',
} as const

export type AnalyticsPeriod =
  (typeof ANALYTICS_PERIOD)[keyof typeof ANALYTICS_PERIOD]

export interface PeriodRange {
  /** Inclusive start, epoch ms. Null means "everything recorded". */
  from: number | null
  /** Exclusive end, epoch ms. */
  to: number
}

export interface ProjectTotal {
  goalId?: ID
  title: string
  totalMs: number
  taskCount: number
}

export interface AnalyticsSummary {
  totalMs: number
  sessionCount: number
  /** Days that have at least one entry — what a freelancer bills as worked. */
  dayCount: number
  byTask: TaskTotal[]
  byProject: ProjectTotal[]
}

export const NO_PROJECT_KEY = '__no_project__'

/** The bucket an entry lands in once grouped by project. */
export function projectTotalKey(entry: Pick<TimeEntry, 'goalId'>): string {
  return entry.goalId ?? NO_PROJECT_KEY
}

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/** Monday-first week, matching the planner's default. */
function startOfWeek(date: Date): Date {
  const start = startOfDay(date)
  const weekday = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - weekday)
  return start
}

export function periodRange(period: AnalyticsPeriod, now: Date): PeriodRange {
  const to = now.getTime()

  if (period === ANALYTICS_PERIOD.ALL) return { from: null, to }

  if (period === ANALYTICS_PERIOD.THIS_WEEK) {
    return { from: startOfWeek(now).getTime(), to }
  }

  if (period === ANALYTICS_PERIOD.LAST_MONTH) {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const until = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: from.getTime(), to: until.getTime() }
  }

  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
    to,
  }
}

export function entriesInRange(
  entries: TimeEntry[],
  range: PeriodRange,
): TimeEntry[] {
  return entries.filter((entry) => {
    const ended = Date.parse(entry.endedAt)
    if (range.from !== null && ended < range.from) return false
    return ended < range.to
  })
}

/**
 * Time grouped by the goal it was booked against. Entries carry the goal they
 * had when recorded, so a task that moved later keeps its history where it was
 * actually earned.
 */
export function totalsByProject(
  entries: TimeEntry[],
  goalTitleById: Map<ID, string>,
): ProjectTotal[] {
  const totals = new Map<string, ProjectTotal>()
  const tasksSeen = new Map<string, Set<string>>()

  entries.forEach((entry) => {
    const key = projectTotalKey(entry)
    const title = entry.goalId
      ? (goalTitleById.get(entry.goalId) ?? 'Deleted project')
      : 'Without a project'

    const existing = totals.get(key)
    const tasks = tasksSeen.get(key) ?? new Set<string>()
    tasks.add(entry.taskId ?? entry.taskTitle ?? 'untitled')
    tasksSeen.set(key, tasks)

    if (existing) {
      existing.totalMs += entryDurationMs(entry)
      return
    }

    totals.set(key, {
      goalId: entry.goalId,
      title,
      totalMs: entryDurationMs(entry),
      taskCount: 0,
    })
  })

  return [...totals]
    .map(([key, total]) => ({
      ...total,
      taskCount: tasksSeen.get(key)?.size ?? 0,
    }))
    .sort((a, b) => b.totalMs - a.totalMs)
}

export function summarize(
  inRange: TimeEntry[],
  goalTitleById: Map<ID, string>,
): AnalyticsSummary {
  return {
    totalMs: inRange.reduce((sum, entry) => sum + entryDurationMs(entry), 0),
    sessionCount: new Set(inRange.map((entry) => entry.sessionId)).size,
    dayCount: new Set(inRange.map(entryDate)).size,
    byTask: totalsByTask(inRange),
    byProject: totalsByProject(inRange, goalTitleById),
  }
}

export interface DateBounds {
  from: ISODate
  /** Inclusive, so a dense day-by-day axis can be filled in. */
  to: ISODate
}

/**
 * The period as whole local days. "All time" has no start of its own, so it
 * begins on the earliest day anything was recorded.
 */
export function periodDateBounds(
  range: PeriodRange,
  entries: TimeEntry[],
  today: ISODate,
): DateBounds {
  const to = toLocalISODate(new Date(range.to - 1))

  if (range.from !== null) {
    return { from: toLocalISODate(new Date(range.from)), to }
  }

  const earliest = entries.reduce<ISODate | null>((found, entry) => {
    const date = entryDate(entry)
    return found === null || date < found ? date : found
  }, null)

  return { from: earliest ?? today, to: to < today ? today : to }
}

/** Tracked milliseconds per day, filed under the day each stretch began on. */
export function totalsByDay(entries: TimeEntry[]): Map<ISODate, number> {
  const totals = new Map<ISODate, number>()

  entries.forEach((entry) => {
    const date = entryDate(entry)
    totals.set(date, (totals.get(date) ?? 0) + entryDurationMs(entry))
  })

  return totals
}

const HOUR_MS = 60 * 60 * 1000

export function earningsFor(totalMs: number, hourlyRate: number): number {
  return (totalMs / HOUR_MS) * hourlyRate
}
