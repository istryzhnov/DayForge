import type { ISODate } from '../entities/types'
import { parseISODate } from './goalSpace/date'

/**
 * Weekday and month names for the panel labels, in English like the rest of
 * the UI. Times and numbers still follow `settings.format`.
 */
const PANEL_LOCALE = 'en-GB'

export function panelDateLabel(
  date: ISODate,
  options: Intl.DateTimeFormatOptions,
): string {
  return parseISODate(date).toLocaleDateString(PANEL_LOCALE, options)
}
