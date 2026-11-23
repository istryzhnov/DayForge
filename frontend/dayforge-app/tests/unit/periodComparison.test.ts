import { describe, expect, it } from 'vitest'
import {
  comparePeriods,
  percentChange,
  previousRange,
  tasksDoneIn,
} from '../../src/features/analytics/composables/periodComparison'

const DAY = 86_400_000

describe('previousRange', () => {
  it('ends where the range starts and has the same length', () => {
    const range = { from: 30 * DAY, to: 40 * DAY }
    expect(previousRange(range)).toEqual({ from: 20 * DAY, to: 30 * DAY })
  })

  it('has no previous period for all time', () => {
    expect(previousRange({ from: null, to: DAY })).toBeNull()
  })
})

describe('percentChange', () => {
  it('reports growth and decline in whole percent', () => {
    expect(percentChange(112, 100)).toBe(12)
    expect(percentChange(80, 100)).toBe(-20)
    expect(percentChange(0, 50)).toBe(-100)
  })

  it('is null when the previous value is zero', () => {
    expect(percentChange(10, 0)).toBeNull()
  })
})

describe('tasksDoneIn', () => {
  const range = { from: 10 * DAY, to: 20 * DAY }
  const at = (day: number) => new Date(day * DAY).toISOString()

  it('counts only done tasks completed inside the range', () => {
    const tasks = [
      { status: 'done', completedAt: at(12) },
      { status: 'done', completedAt: at(9) },
      { status: 'done', completedAt: at(20) },
      { status: 'todo', completedAt: at(12) },
      { status: 'done' },
      { status: 'done', completedAt: 'not a date' },
    ]
    expect(tasksDoneIn(tasks, range)).toBe(1)
  })
})

describe('comparePeriods', () => {
  it('gives no deltas without a previous period', () => {
    expect(
      comparePeriods({ trackedMs: 5, earned: 5, tasksDone: 2 }, null),
    ).toEqual({ trackedPct: null, earnedPct: null, tasksDone: null })
  })

  it('compares tracked time and earnings in percent and tasks by difference', () => {
    const deltas = comparePeriods(
      { trackedMs: 112, earned: 80, tasksDone: 9 },
      { trackedMs: 100, earned: 100, tasksDone: 8 },
    )
    expect(deltas).toEqual({ trackedPct: 12, earnedPct: -20, tasksDone: 1 })
  })
})
