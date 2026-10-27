import type { ISODate } from '../../../entities/types'
import { addDaysToISODate, parseISODate } from '../../../composables/goalSpace/date'

const DAYS_PER_WEEK = 7

/**
 * Names of days and months are always English, because the UI is. The
 * settings locale still drives times and numbers; using it for names here
 * would put Ukrainian month names in an English interface.
 */
export const CALENDAR_NAME_LOCALE = 'en-GB'

/**
 * Locale text comes out lower-cased in some languages. Titles read as
 * headings, so only the first letter is raised.
 */
export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** "Tuesday 27 October" in en-GB (ICU drops the comma). */
export function formatCalendarDayTitle(date: ISODate): string {
  return capitalizeFirst(
    new Intl.DateTimeFormat(CALENDAR_NAME_LOCALE, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(parseISODate(date)),
  )
}

/** "October 2026". */
export function formatCalendarMonthTitle(date: ISODate): string {
  return capitalizeFirst(
    new Intl.DateTimeFormat(CALENDAR_NAME_LOCALE, {
      month: 'long',
      year: 'numeric',
    }).format(parseISODate(date)),
  )
}

/**
 * "26 Oct – 1 Nov 2026" for a week that crosses a month; the month name is
 * dropped from the start when both ends share one.
 */
export function formatCalendarWeekTitle(weekStart: ISODate): string {
  const weekEnd = addDaysToISODate(weekStart, DAYS_PER_WEEK - 1)
  const start = parseISODate(weekStart)
  const end = parseISODate(weekEnd)
  const sameMonth = start.getMonth() === end.getMonth()

  const startText = new Intl.DateTimeFormat(CALENDAR_NAME_LOCALE, {
    day: 'numeric',
    ...(sameMonth ? {} : { month: 'short' }),
  }).format(start)
  const endText = new Intl.DateTimeFormat(CALENDAR_NAME_LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(end)

  return `${startText} – ${endText}`
}

/** Short weekday for a column or grid header, e.g. "Tue". */
export function formatCalendarWeekday(date: ISODate): string {
  return new Intl.DateTimeFormat(CALENDAR_NAME_LOCALE, {
    weekday: 'short',
  }).format(parseISODate(date))
}
