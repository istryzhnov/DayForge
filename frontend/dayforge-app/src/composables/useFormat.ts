import { computed } from 'vue'
import type { ISODate, TimeOfDay } from '../entities/types'
import { parseISODate, toLocalISODate } from './goalSpace/date'
import { CLOCK_FORMAT, useSettings } from './useSettings'

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

    // The AM/PM marker comes from the date locale, so it reads in that language.
    const [hours, minutes] = time.split(':').map(Number)
    return new Intl.DateTimeFormat(locale.value, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(2000, 0, 1, hours, minutes))
  }

  /** A moment in local time, in the user's clock; with its day when the day is wanted. */
  function formatMoment(epochMs: number, withDate: boolean): string {
    const moment = new Date(epochMs)
    const pad = (value: number) => String(value).padStart(2, '0')
    const clock = formatTime(
      `${pad(moment.getHours())}:${pad(moment.getMinutes())}`,
    )
    if (!withDate) return clock
    const day = formatDate(toLocalISODate(moment), {
      day: 'numeric',
      month: 'short',
    })
    return `${day} ${clock}`
  }

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
    formatMoment,
    weekdayLabels,
  }
}
