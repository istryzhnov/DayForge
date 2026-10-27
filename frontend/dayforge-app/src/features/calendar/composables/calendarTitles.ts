import type { ISODate } from '../../../entities/types'
import { addDaysToISODate, parseISODate } from '../../../composables/goalSpace/date'
import {
  capitalizeFirst,
  dateNameLocale,
} from '../../../composables/panelDateLabel'

const DAYS_PER_WEEK = 7

export { capitalizeFirst }

/** "Tuesday 27 October" in en-GB (ICU drops the comma), names in the user's language. */
export function formatCalendarDayTitle(
  date: ISODate,
  locale: string = dateNameLocale(),
): string {
  return capitalizeFirst(
    new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(parseISODate(date)),
  )
}

/** "October 2026". */
export function formatCalendarMonthTitle(
  date: ISODate,
  locale: string = dateNameLocale(),
): string {
  return capitalizeFirst(
    new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
    }).format(parseISODate(date)),
  )
}

/**
 * "26 Oct – 1 Nov 2026" for a week that crosses a month; the month name is
 * dropped from the start when both ends share one.
 */
export function formatCalendarWeekTitle(
  weekStart: ISODate,
  locale: string = dateNameLocale(),
): string {
  const weekEnd = addDaysToISODate(weekStart, DAYS_PER_WEEK - 1)
  const start = parseISODate(weekStart)
  const end = parseISODate(weekEnd)
  const sameMonth = start.getMonth() === end.getMonth()

  const startText = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    ...(sameMonth ? {} : { month: 'short' }),
  }).format(start)
  const endText = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(end)

  return `${startText} – ${endText}`
}

/** Short weekday for a column or grid header, e.g. "Tue". */
export function formatCalendarWeekday(
  date: ISODate,
  locale: string = dateNameLocale(),
): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
  }).format(parseISODate(date))
}
