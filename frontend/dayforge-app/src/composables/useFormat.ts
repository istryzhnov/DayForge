import { computed } from 'vue'
import type { ISODate, TimeOfDay } from '../entities/types'
import { parseISODate } from './goalSpace/date'
import { CLOCK_FORMAT, useSettings } from './useSettings'

/**
 * One place that knows how dates and times are written.
 *
 * They used to be formatted inline with a hard-coded `uk-UA` in three separate
 * files, which meant the calendar spoke Ukrainian while every label around it
 * was English, and no single edit could change that.
 */
export function useFormat() {
  const { settings } = useSettings()

  const locale = computed(() => settings.format.locale)
  const uses12Hour = computed(() => settings.format.clock === CLOCK_FORMAT.H12)

  function formatDate(
    date: ISODate,
    options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    },
  ): string {
    return parseISODate(date).toLocaleDateString(locale.value, options)
  }

  function formatMonth(date: ISODate): string {
    return parseISODate(date).toLocaleDateString(locale.value, {
      month: 'long',
      year: 'numeric',
    })
  }

  /** `hh:mm` as stored, rendered in the user's clock convention. */
  function formatTime(time: TimeOfDay | undefined): string {
    if (!time) return ''
    if (!uses12Hour.value) return time

    const [hours, minutes] = time.split(':').map(Number)
    const suffix = hours < 12 ? 'AM' : 'PM'
    const hour12 = hours % 12 === 0 ? 12 : hours % 12
    return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`
  }

  /**
   * Weekday names in the user's locale, ordered from their first day of the
   * week — the labels used to be a hard-coded Ukrainian array that silently
   * assumed Monday.
   */
  const weekdayLabels = computed(() => {
    const start = settings.calendar.weekStartsOn
    // 2024-01-07 is a Sunday, so adding the weekday index lands on that day.
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(2024, 0, 7 + ((start + index) % 7))
      return day.toLocaleDateString(locale.value, { weekday: 'short' })
    })
  })

  return {
    locale,
    uses12Hour,
    formatDate,
    formatMonth,
    formatTime,
    weekdayLabels,
  }
}
