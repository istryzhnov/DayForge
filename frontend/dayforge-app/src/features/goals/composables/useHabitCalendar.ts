import { computed, onScopeDispose, ref, watch } from 'vue'
import type { HabitDayCell } from '../../../composables/useProgressMetrics'
import type { ISODate } from '../../../entities/types'
import {
  addDaysToISODate,
  parseISODate,
  toLocalISODate,
} from '../../../composables/goalSpace/date'
import { useFormat } from '../../../composables/useFormat'
import { useSettings } from '../../../composables/useSettings'

export type HabitTone = 'none' | 'low' | 'mid' | 'high' | 'full'

export type HabitMark = {
  date: ISODate
  /** Day of month, shown inside the week marks. */
  dayNumber: number
  label: string
  percent: number
  done: number
  total: number
  isToday: boolean
  isFuture: boolean
  /** Had at least one task — tells "nothing planned" apart from "nothing done". */
  isTracked: boolean
  /** Inside the month we have data for; week edges can fall outside it. */
  isKnown: boolean
  tone: HabitTone
  hint: string
}

type HabitProps = {
  cells: HabitDayCell[]
  todayPercent: number
}

export function useHabitCalendar(props: HabitProps) {
  const { settings } = useSettings()
  const { weekdayLabels, formatDate, locale } = useFormat()

  const cellsByDate = computed(
    () => new Map(props.cells.map((cell) => [cell.date, cell])),
  )

  /** Today when the viewed month contains it, otherwise that month's last day. */
  const referenceDate = computed<ISODate | null>(() => {
    if (!props.cells.length) return null
    const today = props.cells.find((cell) => cell.isToday)
    return (today ?? props.cells[props.cells.length - 1]).date
  })

  /** Every day of the month up to and including the reference day. */
  const elapsedCells = computed(() => {
    const reference = referenceDate.value
    if (!reference) return []
    return props.cells.filter((cell) => cell.date <= reference)
  })

  function toneOf(percent: number, total: number): HabitTone {
    if (total <= 0 || percent <= 0) return 'none'
    if (percent < 34) return 'low'
    if (percent < 67) return 'mid'
    if (percent < 100) return 'high'
    return 'full'
  }

  function buildMark(date: ISODate, label: string): HabitMark {
    const cell = cellsByDate.value.get(date)
    const reference = referenceDate.value
    const total = cell?.total ?? 0
    const percent = cell?.percent ?? 0
    const dateText = formatDate(date, { day: 'numeric', month: 'short' })

    return {
      date,
      dayNumber: parseISODate(date).getDate(),
      label,
      percent,
      done: cell?.done ?? 0,
      total,
      isToday: cell?.isToday ?? false,
      isFuture: reference !== null && date > reference,
      isTracked: total > 0,
      isKnown: cell !== undefined,
      tone: toneOf(percent, total),
      hint: total
        ? `${dateText}: ${cell?.done ?? 0} of ${total} done`
        : `${dateText}: nothing planned`,
    }
  }

  const weekDays = computed<HabitMark[]>(() => {
    const reference = referenceDate.value
    if (!reference) return []

    const weekStartsOn = settings.calendar.weekStartsOn
    const offsetIntoWeek =
      (parseISODate(reference).getDay() - weekStartsOn + 7) % 7
    const weekStart = addDaysToISODate(
      toLocalISODate(parseISODate(reference)),
      -offsetIntoWeek,
    )

    return weekdayLabels.value.map((label, offset) =>
      buildMark(addDaysToISODate(weekStart, offset), label),
    )
  })

  const monthDays = computed<HabitMark[]>(() =>
    props.cells.map((cell) => buildMark(cell.date, '')),
  )

  const monthLabel = computed(() => {
    const reference = referenceDate.value
    if (!reference) return ''
    return parseISODate(reference).toLocaleDateString(locale.value, {
      month: 'long',
    })
  })

  // --- the numbers under the marks ----------------------------------------

  const today = computed(() => {
    const cell = props.cells.find((item) => item.isToday)
    return {
      done: cell?.done ?? 0,
      total: cell?.total ?? 0,
      percent: props.todayPercent,
      isTracked: (cell?.total ?? 0) > 0,
      isComplete: (cell?.total ?? 0) > 0 && props.todayPercent >= 100,
    }
  })

  /**
   * Days finished in a row, newest first. A day with nothing planned is
   * neutral — it neither extends nor breaks the chain — and today only breaks
   * it once it is over, so an unfinished today doesn't read as a lost streak.
   */
  const streak = computed(() => {
    const cells = elapsedCells.value
    let count = 0

    for (let index = cells.length - 1; index >= 0; index -= 1) {
      const cell = cells[index]
      if (cell.total <= 0) continue
      if (cell.percent >= 100) {
        count += 1
        continue
      }
      if (cell.isToday) continue
      break
    }

    return count
  })

  const monthStats = computed(() => {
    let done = 0
    let total = 0
    let trackedDays = 0
    let fullDays = 0

    elapsedCells.value.forEach((cell) => {
      if (cell.total <= 0) return
      trackedDays += 1
      done += cell.done
      total += cell.total
      if (cell.percent >= 100) fullDays += 1
    })

    return {
      percent: total > 0 ? Math.round((done / total) * 100) : 0,
      trackedDays,
      fullDays,
      hasData: total > 0,
    }
  })

  const summaryParts = computed(() => {
    const stats = monthStats.value
    if (!stats.hasData) return []

    const parts = [
      `${stats.percent}% done`,
      `${stats.fullDays}/${stats.trackedDays} full days`,
    ]
    if (streak.value > 0) {
      parts.push(
        streak.value === 1 ? '1-day streak' : `${streak.value}-day streak`,
      )
    }

    return parts
  })

  const hasCells = computed(() => props.cells.length > 0)

  // --- finishing a day ----------------------------------------------------

  /** Long enough for the mark to settle, and no longer. */
  const CELEBRATION_MS = 520

  const celebrating = ref(new Set<string>())
  const lastPercentByDate = new Map<string, number>()
  const timers = new Map<string, number>()

  function celebrate(date: ISODate) {
    celebrating.value.add(date)
    window.clearTimeout(timers.get(date))
    timers.set(
      date,
      window.setTimeout(() => {
        celebrating.value.delete(date)
        timers.delete(date)
      }, CELEBRATION_MS),
    )
  }

  watch(
    weekDays,
    (days) => {
      days.forEach((day) => {
        const previous = lastPercentByDate.get(day.date)
        lastPercentByDate.set(day.date, day.percent)

        if (previous === undefined || previous >= 100) return
        if (day.percent < 100) return
        celebrate(day.date)
      })
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    timers.forEach((id) => window.clearTimeout(id))
    timers.clear()
  })

  function isCelebrating(date: ISODate) {
    return celebrating.value.has(date)
  }

  function markClass(mark: HabitMark) {
    return [
      `is-${mark.tone}`,
      {
        'is-today': mark.isToday,
        'is-future': mark.isFuture,
        'is-untracked': mark.isKnown && !mark.isTracked,
        'is-outside': !mark.isKnown,
      },
    ]
  }

  return {
    weekDays,
    monthDays,
    monthLabel,
    today,
    streak,
    monthStats,
    summaryParts,
    hasCells,
    isCelebrating,
    markClass,
  }
}
