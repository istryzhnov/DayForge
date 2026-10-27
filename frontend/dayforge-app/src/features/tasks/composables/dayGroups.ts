import type { ISODate } from '../../../entities/types'
import { panelDateLabel } from '../../../composables/panelDateLabel'
import {
  addDaysToISODate,
  addMonthsToISODate,
  startOfMonthISODate,
  weekdayOfISODate,
} from '../../../composables/goalSpace/date'

export type DayGroup<T> = { date: ISODate; items: T[] }

/** Neighbouring items on the same date form one group; the order is kept. */
export function groupByDay<T extends { date: ISODate }>(
  items: T[],
): DayGroup<T>[] {
  const groups: DayGroup<T>[] = []
  for (const item of items) {
    const last = groups[groups.length - 1]
    if (last && last.date === item.date) last.items.push(item)
    else groups.push({ date: item.date, items: [item] })
  }
  return groups
}

/** "Tuesday, 27 October", the same shape as the timer history headings. */
export function dayHeadingLabel(date: ISODate): string {
  const weekday = panelDateLabel(date, { weekday: 'long' })
  const dayAndMonth = panelDateLabel(date, { day: 'numeric', month: 'long' })
  return `${weekday}, ${dayAndMonth}`
}

/** Done counts for the stats row: this week (from `weekStartsOn`) and this month. */
export function doneCountsOf(
  dates: ISODate[],
  today: ISODate,
  weekStartsOn: 0 | 1,
): { thisWeek: number; thisMonth: number } {
  const offset = (weekdayOfISODate(today) - weekStartsOn + 7) % 7
  const weekStart = addDaysToISODate(today, -offset)
  const weekEnd = addDaysToISODate(weekStart, 7)
  const monthStart = startOfMonthISODate(today)
  const monthEnd = addMonthsToISODate(monthStart, 1)

  let thisWeek = 0
  let thisMonth = 0
  for (const date of dates) {
    if (date >= weekStart && date < weekEnd) thisWeek += 1
    if (date >= monthStart && date < monthEnd) thisMonth += 1
  }
  return { thisWeek, thisMonth }
}
