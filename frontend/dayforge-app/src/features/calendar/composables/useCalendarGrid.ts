export const DAY_START_HOUR = 6
export const DAY_END_HOUR = 23
export const PX_PER_MINUTE = 1
export const SNAP_MINUTES = 15
export const DEFAULT_DURATION_MINUTES = 60

export const HOURS = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
  (_, index) => DAY_START_HOUR + index,
)

export const GRID_HEIGHT_PX =
  (DAY_END_HOUR - DAY_START_HOUR) * 60 * PX_PER_MINUTE

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
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES
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
  const rawMinutes = (clientY - rect.top) / PX_PER_MINUTE - grabOffsetMinutes
  return clampMinutes(snapMinutes(rawMinutes))
}

/** Scheduled duration in minutes, falling back to the default for unscheduled tasks. */
export function durationMinutes(startTime?: string, endTime?: string): number {
  if (!startTime || !endTime) return DEFAULT_DURATION_MINUTES
  return minutesFromDayStart(endTime) - minutesFromDayStart(startTime)
}
