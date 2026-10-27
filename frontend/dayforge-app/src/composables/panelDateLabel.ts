import type { ISODate } from '../entities/types'
import { parseISODate } from './goalSpace/date'
import { useSettings } from './useSettings'

/**
 * The language for day and month names: the one the user picked in the format
 * settings, like times and numbers.
 */
export function dateNameLocale(): string {
  return useSettings().settings.format.locale
}

/**
 * Some languages write day and month names in lower case. A label that opens
 * a heading still starts with a capital, so only the first letter is raised.
 */
export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function panelDateLabel(
  date: ISODate,
  options: Intl.DateTimeFormatOptions,
  locale: string = dateNameLocale(),
): string {
  return parseISODate(date).toLocaleDateString(locale, options)
}
