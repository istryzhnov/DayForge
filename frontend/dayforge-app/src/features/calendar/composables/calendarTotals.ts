import type { ISODate } from '../../../entities/types'

/** Sum of a per-day map over the given dates; days with no entry add nothing. */
export function sumOverDates(
  totals: ReadonlyMap<ISODate, number>,
  dates: readonly ISODate[],
): number {
  return dates.reduce((sum, date) => sum + (totals.get(date) ?? 0), 0)
}
