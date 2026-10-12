import type { ISODate } from '../../entities/types'
import { addDaysToISODate, daysBetweenISODates } from '../goalSpace/date'

const HOUR_MS = 60 * 60 * 1000

/** Past this many days the axis gets unreadable, so days are rolled into weeks. */
const MAX_DAILY_BARS = 70

export const SERIES_GRANULARITY = {
  DAY: 'day',
  WEEK: 'week',
} as const

export type SeriesGranularity =
  (typeof SERIES_GRANULARITY)[keyof typeof SERIES_GRANULARITY]

export interface SeriesPoint {
  /** Start of the bucket. */
  date: ISODate
  /** Short axis text. */
  label: string
  /** Spelled-out bucket, for the hover title. */
  title: string
  totalMs: number
}

export interface TimeSeries {
  granularity: SeriesGranularity
  points: SeriesPoint[]
}

function dayLabel(date: ISODate): string {
  return String(Number(date.slice(8)))
}

function shortLabel(date: ISODate): string {
  return `${Number(date.slice(8))}.${Number(date.slice(5, 7))}`
}

/** Monday-first, matching the planner's week. */
function startOfWeek(date: ISODate): ISODate {
  const [year, month, day] = date.split('-').map(Number)
  const weekday = (new Date(year, month - 1, day).getDay() + 6) % 7
  return addDaysToISODate(date, -weekday)
}

/**
 * One bucket per day across the whole period, days with nothing tracked
 * included — a calm chart needs gaps to read as gaps, not as missing bars.
 */
export function buildSeries(
  totalsByDay: Map<ISODate, number>,
  from: ISODate,
  to: ISODate,
): TimeSeries {
  const span = Math.max(0, daysBetweenISODates(from, to)) + 1
  const granularity =
    span > MAX_DAILY_BARS ? SERIES_GRANULARITY.WEEK : SERIES_GRANULARITY.DAY

  const buckets = new Map<ISODate, number>()
  const order: ISODate[] = []

  for (let offset = 0; offset < span; offset += 1) {
    const date = addDaysToISODate(from, offset)
    const key =
      granularity === SERIES_GRANULARITY.WEEK ? startOfWeek(date) : date

    if (!buckets.has(key)) {
      buckets.set(key, 0)
      order.push(key)
    }
    buckets.set(key, (buckets.get(key) ?? 0) + (totalsByDay.get(date) ?? 0))
  }

  const points = order.map((date) => ({
    date,
    label:
      granularity === SERIES_GRANULARITY.WEEK
        ? shortLabel(date)
        : dayLabel(date),
    title:
      granularity === SERIES_GRANULARITY.WEEK
        ? `Week of ${date}`
        : (date as string),
    totalMs: buckets.get(date) ?? 0,
  }))

  return { granularity, points }
}

export interface Bar {
  x: number
  y: number
  width: number
  height: number
  point: SeriesPoint
}

export interface GridLine {
  y: number
  label: string
}

export interface AxisTick {
  x: number
  label: string
}

export interface BarChartGeometry {
  width: number
  height: number
  /** Where the bars stand. */
  baseline: number
  bars: Bar[]
  gridLines: GridLine[]
  ticks: AxisTick[]
  /** Where the axis furniture sits, so the template holds no coordinates. */
  axis: { labelX: number; gridFrom: number; tickY: number }
  maxHours: number
  isEmpty: boolean
}

const NICE_STEPS = [0.25, 0.5, 1, 2, 3, 4, 6, 8, 12, 16, 24]

/** A top of the scale that reads as a round number of hours. */
export function niceCeiling(hours: number): number {
  if (hours <= 0) return 1
  const step = NICE_STEPS.find((candidate) => hours <= candidate)
  if (step !== undefined) return step
  return Math.ceil(hours / 24) * 24
}

function hourLabel(hours: number): string {
  const rounded = Math.round(hours * 100) / 100
  return `${rounded % 1 === 0 ? rounded : rounded.toFixed(rounded < 1 ? 2 : 1)}h`
}

/** Labels every bar when they fit, and thins out to about six when they don't. */
function tickStride(count: number, slot: number): number {
  const perLabel = Math.max(1, Math.ceil(18 / Math.max(slot, 1)))
  if (count <= 10) return perLabel
  return Math.max(perLabel, Math.ceil(count / 6))
}

export function buildBarChart(
  points: SeriesPoint[],
  options: { width: number; height?: number },
): BarChartGeometry {
  const width = Math.max(160, Math.round(options.width))
  const height = options.height ?? 168
  const padding = { top: 10, right: 4, bottom: 20, left: 34 }

  const plotWidth = Math.max(10, width - padding.left - padding.right)
  const baseline = height - padding.bottom
  const plotHeight = Math.max(10, baseline - padding.top)

  const maxHours = niceCeiling(
    points.reduce((top, point) => Math.max(top, point.totalMs / HOUR_MS), 0),
  )

  const slot = points.length === 0 ? plotWidth : plotWidth / points.length
  const barWidth = Math.max(1.5, Math.min(26, slot * 0.68))

  const bars = points.map((point, index) => {
    const hours = point.totalMs / HOUR_MS
    const barHeight = (hours / maxHours) * plotHeight

    return {
      x: padding.left + slot * index + (slot - barWidth) / 2,
      y: baseline - barHeight,
      width: barWidth,
      height: barHeight,
      point,
    }
  })

  const gridLines = [0, 0.5, 1].map((fraction) => ({
    y: baseline - fraction * plotHeight,
    label: hourLabel(maxHours * fraction),
  }))

  const stride = tickStride(points.length, slot)
  const ticks = points
    .map((point, index) => ({
      x: padding.left + slot * index + slot / 2,
      label: point.label,
      index,
    }))
    .filter((tick) => tick.index % stride === 0)
    .map(({ x, label }) => ({ x, label }))

  return {
    width,
    height,
    baseline,
    bars,
    gridLines,
    ticks,
    axis: {
      labelX: padding.left - 8,
      gridFrom: padding.left - 4,
      tickY: height - 6,
    },
    maxHours,
    isEmpty: points.every((point) => point.totalMs === 0),
  }
}

export interface ShareInput {
  key: string
  label: string
  totalMs: number
}

/** Everything past the top few slices is one "Other", so the ring stays legible. */
export function foldSmallShares(
  shares: ShareInput[],
  maxSlices: number,
): ShareInput[] {
  const ranked = [...shares]
    .filter((share) => share.totalMs > 0)
    .sort((a, b) => b.totalMs - a.totalMs)

  if (ranked.length <= maxSlices) return ranked

  const kept = ranked.slice(0, maxSlices - 1)
  const rest = ranked.slice(maxSlices - 1)

  return [
    ...kept,
    {
      key: '__other__',
      label: `Other (${rest.length})`,
      totalMs: rest.reduce((sum, share) => sum + share.totalMs, 0),
    },
  ]
}
