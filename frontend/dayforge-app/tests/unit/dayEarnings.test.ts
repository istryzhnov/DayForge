import { describe, expect, it } from 'vitest'
import type { TimeEntry } from '../../src/entities/TimerEntity'
import {
  earningsByDate,
  scopeHasRate,
} from '../../src/shared/composables/billing/dayEarnings'
import type { RateLookup } from '../../src/shared/composables/timer/rates'

function entry(
  id: string,
  start: string,
  hours: number,
  extra: Partial<TimeEntry> = {},
): TimeEntry {
  const startedAt = new Date(start)
  const endedAt = new Date(startedAt.getTime() + hours * 3_600_000)
  return {
    id,
    sessionId: id,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    mode: 'stopwatch',
    source: 'manual',
    updatedAt: endedAt.toISOString(),
    ...extra,
  }
}

const lookup = (over: Partial<RateLookup> = {}): RateLookup => ({
  byTask: new Map(),
  byGoal: new Map(),
  defaultRate: 0,
  ...over,
})

describe('earningsByDate', () => {
  it('prices each entry by task, then project, then the default rate', () => {
    const rates = lookup({
      byTask: new Map([['t1', 60]]),
      byGoal: new Map([['g1', 40]]),
      defaultRate: 10,
    })
    const entries = [
      entry('a', '2026-11-20T09:00:00', 1, { taskId: 't1', goalId: 'g1' }),
      entry('b', '2026-11-20T11:00:00', 2, { goalId: 'g1' }),
      entry('c', '2026-11-21T09:00:00', 3),
    ]
    const byDate = earningsByDate(entries, rates)
    expect(byDate.get('2026-11-20')).toBe(60 + 80)
    expect(byDate.get('2026-11-21')).toBe(30)
  })

  it('narrows to one project and skips unpriced time', () => {
    const rates = lookup({ byGoal: new Map([['g1', 50]]) })
    const entries = [
      entry('a', '2026-11-20T09:00:00', 2, { goalId: 'g1' }),
      entry('b', '2026-11-20T12:00:00', 2, { goalId: 'g2' }),
    ]
    expect(earningsByDate(entries, rates, 'g1').get('2026-11-20')).toBe(100)
    expect(earningsByDate(entries, rates, 'g2').has('2026-11-20')).toBe(false)
  })
})

describe('scopeHasRate', () => {
  it('is false with no rate anywhere', () => {
    expect(scopeHasRate(lookup(), null)).toBe(false)
    expect(scopeHasRate(lookup(), 'g1')).toBe(false)
  })

  it('follows a project rate only for that project', () => {
    const rates = lookup({ byGoal: new Map([['g1', 50]]) })
    expect(scopeHasRate(rates, null)).toBe(true)
    expect(scopeHasRate(rates, 'g1')).toBe(true)
    expect(scopeHasRate(rates, 'g2')).toBe(false)
  })

  it('is true everywhere once a default rate is set', () => {
    expect(scopeHasRate(lookup({ defaultRate: 20 }), 'g2')).toBe(true)
  })
})
