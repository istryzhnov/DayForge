import { computed, onScopeDispose, ref, watch } from 'vue'
import type { ISODate } from '../../../entities/types'
import {
  addDaysToISODate,
  getTodayISODate,
  parseISODate,
  toLocalISODate,
} from '../../../composables/goalSpace/date'
import type {
  HabitMonthDayTotal,
  HabitMonthView,
} from '../../../composables/analytics/habits'
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
  /** Had at least one habit due — tells "nothing due" apart from "nothing done". */
  isTracked: boolean
  /** Inside the month we have data for; week edges can fall outside it. */
  isKnown: boolean
  tone: HabitTone
  hint: string
}

type HabitProps = {
  view: HabitMonthView
}

export function useHabitCalendar(props: HabitProps) {
  const { settings } = useSettings()
  const { weekdayLabels, formatDate, locale } = useFormat()
  const todayISO = getTodayISODate()

  const dayByDate = computed(
    () =>
      new Map<ISODate, HabitMonthDayTotal>(
        props.view.dayTotals.map((day) => [day.date, day]),
      ),
  )

  /** Today when the viewed month contains it, otherwise that month's last day. */
  const referenceDate = computed<ISODate | null>(() => {
    const days = props.view.dayTotals
    if (!days.length) return null
    const today = days.find((day) => day.date === todayISO)
    return (today ?? days[days.length - 1]).date
  })

  function toneOf(percent: number, total: number): HabitTone {
    if (total <= 0 || percent <= 0) return 'none'
    if (percent < 34) return 'low'
    if (percent < 67) return 'mid'
    if (percent < 100) return 'high'
    return 'full'
  }

  function buildMark(date: ISODate, label: string): HabitMark {
    const day = dayByDate.value.get(date)
    const reference = referenceDate.value
    const total = day?.total ?? 0
    const done = day?.done ?? 0
    const percent = total > 0 ? (done / total) * 100 : 0
    const dateText = formatDate(date, { day: 'numeric', month: 'short' })

    return {
      date,
      dayNumber: parseISODate(date).getDate(),
      label,
      percent,
      done,
      total,
      isToday: date === todayISO,
      isFuture: reference !== null && date > reference,
      isTracked: total > 0,
      isKnown: day !== undefined,
      tone: toneOf(percent, total),
      hint: total
        ? `${dateText}: ${done} of ${total} done`
        : `${dateText}: nothing due`,
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
    props.view.dayTotals.map((day) => buildMark(day.date, '')),
  )

  const monthLabel = computed(() => {
    const reference = referenceDate.value
    if (!reference) return ''
    return parseISODate(reference).toLocaleDateString(locale.value, {
      month: 'long',
    })
  })

  // --- the numbers under the marks, straight from the shared habit view --

  const summaryParts = computed(() => {
    const view = props.view
    if (view.trackedDays === 0) return []

    const parts = [
      `${Math.round((view.completionRate ?? 0) * 100)}% done`,
      `${view.fullDays}/${view.trackedDays} full days`,
    ]
    if (view.currentStreak > 0) {
      parts.push(
        view.currentStreak === 1
          ? '1-day streak'
          : `${view.currentStreak}-day streak`,
      )
    }

    return parts
  })

  const hasCells = computed(() => props.view.dayTotals.length > 0)

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
    summaryParts,
    hasCells,
    isCelebrating,
    markClass,
  }
}
