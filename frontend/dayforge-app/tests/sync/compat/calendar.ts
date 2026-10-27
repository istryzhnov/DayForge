/** Compat checks: calendar titles. */

import {
  capitalizeFirst,
  formatCalendarDayTitle,
  formatCalendarMonthTitle,
  formatCalendarWeekday,
  formatCalendarWeekTitle,
} from '../../../src/features/calendar/composables/calendarTitles'
import { check, section } from './harness'

export function verifyCalendarTitles() {
  section('Calendar titles: one locale, normal capitalisation')

  check(
    'the day title is a plain sentence with English names',
    formatCalendarDayTitle('2026-10-27', 'en-GB') === 'Tuesday 27 October',
    formatCalendarDayTitle('2026-10-27', 'en-GB'),
  )
  check(
    'the month title names the month and year',
    formatCalendarMonthTitle('2026-10-01', 'en-GB') === 'October 2026',
    formatCalendarMonthTitle('2026-10-01', 'en-GB'),
  )
  check(
    'a week across two months names both months',
    formatCalendarWeekTitle('2026-10-26', 'en-GB') === '26 Oct – 1 Nov 2026',
    formatCalendarWeekTitle('2026-10-26', 'en-GB'),
  )
  check(
    'weekday headers use the short English name',
    formatCalendarWeekday('2026-10-27', 'en-GB') === 'Tue',
  )
  check(
    'capitalizeFirst leaves empty text and other letters alone',
    capitalizeFirst('') === '' && capitalizeFirst('october') === 'October',
  )
}
