import { describe, expect, it } from 'vitest'
import type { ActiveTimer, TimeEntry } from '../../src/entities/TimerEntity'
import {
  liveStretchMs,
  sessionEarned,
  taskRate,
} from '../../src/features/timer/composables/timerSubline'
import type { RateLookup } from '../../src/shared/composables/timer/rates'

const HOUR_MS = 3_600_000

function entry(id: string, sessionId: string, hours: number, taskId?: string) {
  const startedAt = Date.parse('2026-11-23T09:00:00Z')
  return {
    id,
    sessionId,
    startedAt: new Date(startedAt).toISOString(),
    endedAt: new Date(startedAt + hours * HOUR_MS).toISOString(),
    mode: 'stopwatch',
    source: 'timer',
    taskId,
    updatedAt: new Date(startedAt).toISOString(),
  } as TimeEntry
}

const lookup = (over: Partial<RateLookup> = {}): RateLookup => ({
  byTask: new Map(),
  byGoal: new Map(),
  defaultRate: 0,
  ...over,
})

const running = (over: Partial<ActiveTimer> = {}): ActiveTimer =>
  ({
    sessionId: 's1',
    mode: 'stopwatch',
    status: 'running',
    startedAt: 1_000,
    accumulatedMs: 0,
    completedFocusCount: 0,
    ...over,
  }) as ActiveTimer

describe('liveStretchMs', () => {
  it('counts the running stretch since it began', () => {
    expect(liveStretchMs(running(), 4_000)).toBe(3_000)
  })

  it('counts nothing when paused or idle', () => {
    expect(
      liveStretchMs(running({ status: 'paused', startedAt: null }), 4_000),
    ).toBe(0)
    expect(liveStretchMs(running({ status: 'idle' }), 4_000)).toBe(0)
  })

  it('counts nothing during a pomodoro break, which is never recorded', () => {
    const brk = running({ mode: 'pomodoro', phase: 'shortBreak' })
    expect(liveStretchMs(brk, 4_000)).toBe(0)
  })
})

describe('sessionEarned', () => {
  it('prices saved stretches of this sitting and ignores other sittings', () => {
    const entries = [
      entry('a', 's1', 1, 't1'),
      entry('b', 's1', 2, 't1'),
      entry('c', 's2', 5, 't1'),
    ]
    const earned = sessionEarned({
      entries,
      sessionId: 's1',
      liveMs: 0,
      task: { taskId: 't1', taskTitle: 'x' },
      lookup: lookup({ byTask: new Map([['t1', 45]]) }),
    })
    expect(earned).toBeCloseTo(3 * 45)
  })

  it('adds the live stretch at the attached task rate', () => {
    const earned = sessionEarned({
      entries: [],
      sessionId: 's1',
      liveMs: HOUR_MS / 2,
      task: { taskId: 't1', taskTitle: 'x', goalId: 'g1' },
      lookup: lookup({ byGoal: new Map([['g1', 40]]) }),
    })
    expect(earned).toBeCloseTo(20)
  })

  it('is zero when nothing carries a rate', () => {
    expect(
      sessionEarned({
        entries: [entry('a', 's1', 2)],
        sessionId: 's1',
        liveMs: HOUR_MS,
        lookup: lookup(),
      }),
    ).toBe(0)
  })

  it('treats an empty session id as having no saved stretches', () => {
    expect(
      sessionEarned({
        entries: [entry('a', '', 2)],
        sessionId: '',
        liveMs: 0,
        lookup: lookup({ defaultRate: 10 }),
      }),
    ).toBe(0)
  })
})

describe('taskRate', () => {
  it('prefers the task rate, then the project rate, then the default', () => {
    const l = lookup({
      byTask: new Map([['t1', 60]]),
      byGoal: new Map([['g1', 30]]),
      defaultRate: 10,
    })
    expect(taskRate(l, { taskId: 't1', taskTitle: '', goalId: 'g1' })).toBe(60)
    expect(taskRate(l, { taskId: 't2', taskTitle: '', goalId: 'g1' })).toBe(30)
    expect(taskRate(l, { taskId: 't2', taskTitle: '' })).toBe(10)
    expect(taskRate(l, undefined)).toBe(10)
  })
})
