import type { Goal } from '../../../entities/GoalEntity'
import type { DailyTask, TaskTemplate } from '../../../entities/TaskEntity'
import type { TimeEntry } from '../../../entities/TimerEntity'
import type { ISODate } from '../../../entities/types'
import {
  ANALYTICS_PERIOD,
  NO_PROJECT_KEY,
  projectTotalKey,
  type AnalyticsPeriod,
  type ProjectTotal,
} from '../../../composables/timer/analytics'
import { entryDate } from '../../../composables/timer/entries'
import {
  addDaysToISODate,
  addMonthsToISODate,
  startOfMonthISODate,
  weekdayOfISODate,
} from '../../../composables/goalSpace/date'
import { occursOn } from '../../../composables/goalSpace/recurrence'
import { segmentForDay } from '../../../composables/goalSpace/overnight'
import { englishText, type Text } from './projectBilling'

const MINUTE_MS = 60 * 1000

/** Tolerance inside which a plan counts as kept, so rounding never reads as over. */
const ON_PLAN_RATIO = 0.005

export const PLAN_STATE = {
  OVER: 'over',
  UNDER: 'under',
  ON: 'on',
  /** Time was tracked on a project with nothing planned for it. */
  UNPLANNED: 'unplanned',
} as const

export type PlanState = (typeof PLAN_STATE)[keyof typeof PLAN_STATE]

function minutesOf(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Length of one scheduled block in ms. A block with a start but no end gets the
 * calendar's default length, as the calendar draws it; a block with no start is
 * not on the grid and counts for nothing.
 */
export function blockDurationMs(
  startTime: string | undefined,
  endTime: string | undefined,
  defaultDurationMinutes: number,
): number {
  if (!startTime) return 0
  const minutes = endTime
    ? minutesOf(endTime) - minutesOf(startTime)
    : defaultDurationMinutes
  return minutes > 0 ? minutes * MINUTE_MS : 0
}

export interface PlanSource {
  templates: TaskTemplate[]
  dailyTasks: DailyTask[]
  /** calendar.defaultDurationMinutes, for blocks that only have a start time. */
  defaultDurationMinutes: number
}

/** One scheduled block as the plan sees it: a row, or a template's rule on a day. */
type PlanBlock = {
  date: ISODate
  goalId?: string
  startTime?: string
  endTime?: string
}

/**
 * Planned ms per project over an inclusive date range. The calendar shows a
 * repeating task on every day its rule hits, and a day row replaces that
 * projection, so a day is counted once: from its row if it has one, from the
 * template's rule otherwise. Inactive templates are not planned, as in the
 * upcoming list.
 *
 * A block that runs past midnight is split by day: its evening counts on the
 * day it starts and its morning on the next day. The day before the range is
 * read too, so the first day of a week or month still gets the morning of a
 * block that began the night before.
 */
export function plannedMsByProject(
  source: PlanSource,
  from: ISODate,
  to: ISODate,
): Map<string, number> {
  const activeTemplates = source.templates.filter(
    (template) => template.isActive,
  )
  const templateById = new Map(
    activeTemplates.map((template) => [template.id, template]),
  )

  const earliestRead = addDaysToISODate(from, -1)
  const rowsByDate = new Map<ISODate, DailyTask[]>()
  source.dailyTasks.forEach((row) => {
    if (row.date < earliestRead || row.date > to) return
    if (!templateById.has(row.templateId)) return
    const bucket = rowsByDate.get(row.date)
    if (bucket) bucket.push(row)
    else rowsByDate.set(row.date, [row])
  })

  const blocksOn = (date: ISODate): PlanBlock[] => {
    const rows = rowsByDate.get(date) ?? []
    const materialized = new Set(rows.map((row) => row.templateId))
    const blocks: PlanBlock[] = rows.map((row) => ({
      date,
      goalId: row.goalId,
      startTime: row.startTime,
      endTime: row.endTime,
    }))

    activeTemplates.forEach((template) => {
      if (materialized.has(template.id)) return
      if (!occursOn(template, date)) return
      blocks.push({
        date,
        goalId: template.goalId,
        startTime: template.startTime,
        endTime: template.endTime,
      })
    })

    return blocks
  }

  // What one block plans on `day`: all of it on its own day, or its share of
  // the day when it runs past midnight.
  const planOn = (day: ISODate, block: PlanBlock, add: PlanAdder) => {
    if (!block.endTime) {
      if (day === block.date) {
        add(
          block.goalId,
          blockDurationMs(
            block.startTime,
            undefined,
            source.defaultDurationMinutes,
          ),
        )
      }
      return
    }

    const segment = segmentForDay(day, block)
    if (!segment) return
    add(
      block.goalId,
      blockDurationMs(
        segment.startTime,
        segment.endTime,
        source.defaultDurationMinutes,
      ),
    )
  }

  const planned = new Map<string, number>()
  const add: PlanAdder = (goalId, ms) => {
    if (ms <= 0) return
    const key = goalId ?? NO_PROJECT_KEY
    planned.set(key, (planned.get(key) ?? 0) + ms)
  }

  let yesterday = blocksOn(earliestRead)
  for (let date = from; date <= to; date = addDaysToISODate(date, 1)) {
    const today = blocksOn(date)
    today.forEach((block) => planOn(date, block, add))
    yesterday.forEach((block) => planOn(date, block, add))
    yesterday = today
  }

  return planned
}

type PlanAdder = (goalId: string | undefined, ms: number) => void

/**
 * The dates a plan covers for a period. The current week or month runs up to
 * today, so days still ahead are not counted yet. Last month is planned in
 * full. All time has no end of its own, so it runs from the first recorded or
 * planned day up to today.
 */
export function planBounds(
  period: AnalyticsPeriod,
  today: ISODate,
  earliest: ISODate | null,
): { from: ISODate; to: ISODate } {
  const monthStart = startOfMonthISODate(today)

  if (period === ANALYTICS_PERIOD.THIS_MONTH) {
    const monthEnd = addDaysToISODate(addMonthsToISODate(monthStart, 1), -1)
    return { from: monthStart, to: today < monthEnd ? today : monthEnd }
  }

  if (period === ANALYTICS_PERIOD.LAST_MONTH) {
    return {
      from: addMonthsToISODate(monthStart, -1),
      to: addDaysToISODate(monthStart, -1),
    }
  }

  if (period === ANALYTICS_PERIOD.THIS_WEEK) {
    // Monday-first, matching the Analytics week.
    const mondayOffset = (weekdayOfISODate(today) + 6) % 7
    const monday = addDaysToISODate(today, -mondayOffset)
    const sunday = addDaysToISODate(monday, 6)
    return { from: monday, to: today < sunday ? today : sunday }
  }

  const start = earliest !== null && earliest < today ? earliest : today
  return { from: start, to: today }
}

/** The first day anything was recorded or planned, for the All time plan. */
export function earliestPlanDate(
  entries: TimeEntry[],
  dailyTasks: DailyTask[],
  templates: TaskTemplate[],
): ISODate | null {
  let earliest: ISODate | null = null
  const consider = (date: ISODate | undefined) => {
    if (!date) return
    if (earliest === null || date < earliest) earliest = date
  }

  entries.forEach((entry) => consider(entryDate(entry)))
  dailyTasks.forEach((row) => consider(row.date))
  templates.forEach((template) => {
    if (template.isActive) consider(template.recurrence?.startDate)
  })

  return earliest
}

export interface PlanVsActualRow {
  key: string
  goalId?: string
  title: string
  plannedMs: number
  actualMs: number
  /** Actual minus planned, in ms: positive means more time than planned. */
  diffMs: number
  /** Difference as a share of the plan; null when nothing was planned. */
  percent: number | null
  state: PlanState
}

export interface PlanVsActualResult {
  rows: PlanVsActualRow[]
  total: Omit<PlanVsActualRow, 'key' | 'goalId' | 'title'>
}

export function planState(plannedMs: number, actualMs: number): PlanState {
  if (plannedMs <= 0) return PLAN_STATE.UNPLANNED
  const ratio = (actualMs - plannedMs) / plannedMs
  if (Math.abs(ratio) < ON_PLAN_RATIO) return PLAN_STATE.ON
  return ratio > 0 ? PLAN_STATE.OVER : PLAN_STATE.UNDER
}

function rowFor(
  key: string,
  title: string,
  goalId: string | undefined,
  plannedMs: number,
  actualMs: number,
): PlanVsActualRow {
  const diffMs = actualMs - plannedMs
  return {
    key,
    goalId,
    title,
    plannedMs,
    actualMs,
    diffMs,
    percent: plannedMs > 0 ? (diffMs / plannedMs) * 100 : null,
    state: planState(plannedMs, actualMs),
  }
}

/**
 * Plan against actual per project. Rows with neither planned nor tracked time
 * are left out, and so are unplanned rows under a minute, which only add noise.
 * The total's percent compares the two overall sums, over every row.
 */
export function planVsActual(
  planned: Map<string, number>,
  actual: ProjectTotal[],
  goals: Goal[],
  text: Text = englishText,
): PlanVsActualResult {
  const actualByKey = new Map(
    actual.map((project) => [projectTotalKey(project), project]),
  )
  const goalById = new Map(goals.map((goal) => [goal.id, goal]))

  const keys = new Set<string>([...planned.keys(), ...actualByKey.keys()])
  const allRows = [...keys]
    .map((key) => {
      const plannedMs = planned.get(key) ?? 0
      const found = actualByKey.get(key)
      const actualMs = found?.totalMs ?? 0
      const goal = goalById.get(key)

      const title =
        found?.title ??
        goal?.title ??
        (key === NO_PROJECT_KEY
          ? text('analytics.noProject')
          : text('analytics.deletedProject'))

      return rowFor(key, title, goal?.id ?? found?.goalId, plannedMs, actualMs)
    })
    .filter((row) => row.plannedMs > 0 || row.actualMs > 0)

  // Totals count every row; the sub-minute cut only trims what is listed.
  const plannedTotal = allRows.reduce((sum, row) => sum + row.plannedMs, 0)
  const actualTotal = allRows.reduce((sum, row) => sum + row.actualMs, 0)
  const overall = rowFor(
    'total',
    text('analytics.colTotal'),
    undefined,
    plannedTotal,
    actualTotal,
  )

  const rows = allRows
    .filter((row) => row.plannedMs > 0 || row.actualMs >= MINUTE_MS)
    .sort(
      (a, b) =>
        b.plannedMs + b.actualMs - (a.plannedMs + a.actualMs) ||
        a.title.localeCompare(b.title),
    )

  return {
    rows,
    total: {
      plannedMs: overall.plannedMs,
      actualMs: overall.actualMs,
      diffMs: overall.diffMs,
      percent: overall.percent,
      state: overall.state,
    },
  }
}
