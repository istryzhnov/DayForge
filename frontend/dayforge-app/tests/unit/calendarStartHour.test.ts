import { describe, expect, it } from 'vitest'
import {
  DEFAULT_START_HOUR,
  pickStartHour,
} from '../../src/features/calendar/composables/calendarStartHour'

const at = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

describe('pickStartHour', () => {
  it('starts one hour above the earliest timed block', () => {
    expect(
      pickStartHour({
        blockStartMinutes: [at('13:00'), at('09:00'), at('19:00')],
        rangeHasToday: false,
        nowMinutes: at('22:00'),
      }),
    ).toBe(8)
  })

  it('uses the whole hour a block starts in, not its exact minute', () => {
    expect(
      pickStartHour({
        blockStartMinutes: [at('09:30')],
        rangeHasToday: false,
        nowMinutes: 0,
      }),
    ).toBe(8)
  })

  it('ignores "now" when a block is on screen', () => {
    expect(
      pickStartHour({
        blockStartMinutes: [at('10:00')],
        rangeHasToday: true,
        nowMinutes: at('18:00'),
      }),
    ).toBe(9)
  })

  it('scrolls to one hour before now when the range has no blocks and contains today', () => {
    expect(
      pickStartHour({
        blockStartMinutes: [],
        rangeHasToday: true,
        nowMinutes: at('14:22'),
      }),
    ).toBe(13)
  })

  it('falls back to 08:00 when there are no blocks and today is not in range', () => {
    expect(
      pickStartHour({
        blockStartMinutes: [],
        rangeHasToday: false,
        nowMinutes: at('14:22'),
      }),
    ).toBe(DEFAULT_START_HOUR)
    expect(DEFAULT_START_HOUR).toBe(8)
  })

  it('never goes above midnight', () => {
    expect(
      pickStartHour({
        blockStartMinutes: [at('00:00')],
        rangeHasToday: false,
        nowMinutes: 0,
      }),
    ).toBe(0)
    expect(
      pickStartHour({
        blockStartMinutes: [],
        rangeHasToday: true,
        nowMinutes: at('00:20'),
      }),
    ).toBe(0)
  })

  it('never points past the last hour of the grid', () => {
    expect(
      pickStartHour({
        blockStartMinutes: [at('23:45')],
        rangeHasToday: false,
        nowMinutes: 0,
      }),
    ).toBe(22)
    expect(
      pickStartHour({
        blockStartMinutes: [],
        rangeHasToday: true,
        nowMinutes: at('23:59'),
      }),
    ).toBe(22)
  })
})
