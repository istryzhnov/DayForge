import { describe, expect, it } from 'vitest'
import { sumOverDates } from '../../src/features/calendar/composables/calendarTotals'

describe('sumOverDates', () => {
  const totals = new Map([
    ['2026-11-23', 3_600_000],
    ['2026-11-24', 1_800_000],
  ])

  it('adds the days that have time and skips the rest', () => {
    expect(
      sumOverDates(totals, ['2026-11-23', '2026-11-24', '2026-11-25']),
    ).toBe(5_400_000)
  })

  it('is zero for an empty range or days with no time', () => {
    expect(sumOverDates(totals, [])).toBe(0)
    expect(sumOverDates(totals, ['2026-11-29'])).toBe(0)
  })
})
