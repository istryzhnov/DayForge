import { computed } from 'vue'
import { DAY_WINDOW } from '../../../entities/constants'
import { useSettings } from '../../../composables/useSettings'
import type { OverlapSlot } from './overlapLayout'

/**
 * Pure geometry for the day/week grid.
 *
 * The day window stays 00:00–24:00 deliberately: a narrower window would leave
 * tasks scheduled outside it with nowhere to render, so nothing configurable
 * touches it. Zoom, snapping and the default block length *are* user settings,
 * and are read live rather than frozen at import time — `pxPerMinute()` and
 * friends are functions so a change in the settings panel reaches every
 * computed that calls them.
 */

export const DAY_START_HOUR = DAY_WINDOW.START_HOUR
export const DAY_END_HOUR = DAY_WINDOW.END_HOUR

export const HOURS = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
  (_, index) => DAY_START_HOUR + index,
)

const { settings } = useSettings()

/** Pixels per minute, derived from the configured height of one hour. */
export function pxPerMinute(): number {
  return settings.calendar.hourHeight / 60
}

export function snapStepMinutes(): number {
  return settings.calendar.snapMinutes
}

export function defaultDurationMinutes(): number {
  return settings.calendar.defaultDurationMinutes
}

/** Reactive so the grid element resizes as soon as the zoom changes. */
export const gridHeightPx = computed(
  () => (DAY_END_HOUR - DAY_START_HOUR) * 60 * pxPerMinute(),
)

export function minutesFromDayStart(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return (hours - DAY_START_HOUR) * 60 + minutes
}

export function timeFromMinutes(minutes: number): string {
  const totalMinutes = DAY_START_HOUR * 60 + minutes
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

export function snapMinutes(minutes: number): number {
  const step = snapStepMinutes()
  return Math.round(minutes / step) * step
}

export function clampMinutes(minutes: number): number {
  const max = (DAY_END_HOUR - DAY_START_HOUR) * 60
  return Math.min(Math.max(minutes, 0), max)
}

/** Convert a viewport Y coordinate into snapped, in-range grid minutes. */
export function minutesFromClientY(
  gridElement: HTMLElement,
  clientY: number,
  grabOffsetMinutes = 0,
): number {
  const rect = gridElement.getBoundingClientRect()
  const rawMinutes = (clientY - rect.top) / pxPerMinute() - grabOffsetMinutes
  return clampMinutes(snapMinutes(rawMinutes))
}

// --- style helpers ------------------------------------------------------
//
// Bound as functions rather than inline objects, which vue-tsc reports as
// CSSProperties mismatches — and shared so the day and week grids cannot
// drift apart on the arithmetic.

export function gridStyle(heightPx: number) {
  return { height: `${heightPx}px` }
}

export function hourLineStyle(hour: number) {
  return { top: `${(hour - DAY_START_HOUR) * 60 * pxPerMinute()}px` }
}

/** Gap between two blocks sharing the same hours, so the seam is visible. */
const COLUMN_GAP_PX = 3

/**
 * Where a block sits across the strip once overlaps have been split into
 * columns. `insetPx` is the breathing room the strip keeps on both sides, so a
 * lone block lands exactly where it did before any of this existed.
 */
export function columnStyle(slot: OverlapSlot | undefined, insetPx: number) {
  const full = `calc(100% - ${insetPx * 2}px)`
  if (!slot || slot.columns === 1) {
    return { left: `${insetPx}px`, width: full }
  }

  return {
    left: `calc(${insetPx}px + ${full} * ${slot.left})`,
    width: `calc(${full} * ${slot.width} - ${COLUMN_GAP_PX}px)`,
  }
}

/** Scheduled duration in minutes, falling back to the default for unscheduled tasks. */
export function durationMinutes(startTime?: string, endTime?: string): number {
  if (!startTime || !endTime) return defaultDurationMinutes()
  return minutesFromDayStart(endTime) - minutesFromDayStart(startTime)
}
