import { computed } from 'vue'
import type { HabitDayCell } from '../../../composables/useProgressMetrics'
import {
  addDaysToISODate,
  parseISODate,
  toLocalISODate,
} from '../../../composables/goalSpace/date'
import { useFormat } from '../../../composables/useFormat'
import { useSettings } from '../../../composables/useSettings'

/**
 * The week strip under a goal panel.
 *
 * Built by walking the seven days around today rather than by taking the last
 * seven cells: days with no rows have no cell at all, and a strip that skipped
 * them would silently misalign the weekday labels.
 */

export type HabitWeekCell = {
  label: string
  date: string
  percent: number
  done: number
  total: number
  isToday: boolean
}

type HabitProps = {
  cells: HabitDayCell[]
}

export function useHabitCalendar(props: HabitProps) {
  const { settings } = useSettings()
  const { weekdayLabels } = useFormat()

  const cellsByDate = computed(
    () => new Map(props.cells.map((cell) => [cell.date, cell])),
  )

  const weekCells = computed<HabitWeekCell[]>(() => {
    if (!props.cells.length) return []

    const todayCell =
      props.cells.find((cell) => cell.isToday) ??
      props.cells[props.cells.length - 1]
    const weekStartsOn = settings.calendar.weekStartsOn
    const offsetIntoWeek =
      (parseISODate(todayCell.date).getDay() - weekStartsOn + 7) % 7
    const weekStart = addDaysToISODate(
      toLocalISODate(parseISODate(todayCell.date)),
      -offsetIntoWeek,
    )

    return weekdayLabels.value.map((label, offset) => {
      const date = addDaysToISODate(weekStart, offset)
      const cell = cellsByDate.value.get(date)

      return {
        label,
        date,
        percent: cell?.percent ?? 0,
        done: cell?.done ?? 0,
        total: cell?.total ?? 0,
        isToday: cell?.isToday ?? false,
      }
    })
  })

  /** Heat-map bucket for a day's completion share. */
  function levelClass(percent: number) {
    if (percent <= 0) return 'lv-0'
    if (percent < 25) return 'lv-1'
    if (percent < 50) return 'lv-2'
    if (percent < 75) return 'lv-3'
    return 'lv-4'
  }

  function progressState(percent: number) {
    if (percent <= 0) return 'is-empty'
    if (percent < 35) return 'is-low'
    if (percent < 70) return 'is-medium'
    if (percent < 100) return 'is-high'
    return 'is-complete'
  }

  /** Feeds the conic-gradient ring; clamped so a stray value can't overdraw it. */
  function progressStyle(percent: number) {
    return { '--progress': `${Math.max(0, Math.min(100, percent))}%` }
  }

  return { weekCells, levelClass, progressState, progressStyle }
}
