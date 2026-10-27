/** Compat checks: project progress and the project panel stats. */

import {
  habitStreaks,
  habitWindowView,
} from '../../../src/composables/analytics/habits'
import {
  habitWindowDays,
  monthTrackedMs,
} from '../../../src/features/goals/composables/projectPanelStats'
import type { ISODate } from '../../../src/entities/types'
import type { Goal } from '../../../src/entities/GoalEntity'
import type { DailyTask, TaskTemplate } from '../../../src/entities/TaskEntity'
import { planVsActual } from '../../../src/features/analytics/composables/planVsActual'
import { mergeProjectProgress } from '../../../src/features/analytics/composables/projectProgress'
import { type ProjectTotal } from '../../../src/composables/timer/analytics'
import { RECURRENCE_TYPE } from '../../../src/entities/constants'
import type { TimeEntry } from '../../../src/entities/TimerEntity'
import { T0, check, section } from './harness'

export function verifyProjectProgress() {
  section('Time tab: one project list merges tracked time with plans')

  const HOUR = 60 * 60 * 1000
  const goals = [{ id: 'goal-b', title: 'Beta' }] as Goal[]
  const planned = new Map<string, number>([
    ['goal-a', 4 * HOUR],
    ['goal-b', 2 * HOUR],
    ['goal-c', 1 * HOUR],
  ])
  const actual: ProjectTotal[] = [
    { goalId: 'goal-a', title: 'Alpha', totalMs: 5 * HOUR, taskCount: 2 },
  ]
  const plans = planVsActual(planned, actual, goals).rows

  const merged = mergeProjectProgress(
    [
      {
        key: 'goal-a',
        goalId: 'goal-a',
        title: 'Alpha',
        color: '#123456',
        taskCount: 2,
        trackedMs: 5 * HOUR,
      },
      {
        key: 'goal-d',
        goalId: 'goal-d',
        title: 'Gamma',
        taskCount: 1,
        trackedMs: HOUR,
      },
    ],
    plans,
  )
  const byKey = new Map(merged.map((row) => [row.key, row]))

  check(
    'a planned project keeps its plan and a diff against tracked time',
    byKey.get('goal-a')?.plannedMs === 4 * HOUR &&
      byKey.get('goal-a')?.planned === true &&
      byKey.get('goal-a')?.diffMs === HOUR &&
      byKey.get('goal-a')?.taskCount === 2,
    merged,
  )
  check(
    'a planned project with no time still shows, with an empty fill',
    byKey.get('goal-b')?.title === 'Beta' &&
      byKey.get('goal-b')?.trackedMs === 0 &&
      byKey.get('goal-b')?.fill === 0 &&
      byKey.get('goal-b')?.diffMs === -2 * HOUR,
    merged,
  )
  check(
    'a plan for a project no longer listed still shows, under its stored title',
    byKey.get('goal-c')?.title === 'Deleted project' &&
      byKey.get('goal-c')?.plannedMs === HOUR,
    merged,
  )
  check(
    'an unplanned project is neutral: no plan, no diff, full bar',
    byKey.get('goal-d')?.planned === false &&
      byKey.get('goal-d')?.diffMs === null &&
      byKey.get('goal-d')?.fill === 1,
    merged,
  )
  check(
    'the bar fills to the share of the plan and never past full',
    byKey.get('goal-a')?.fill === 1 &&
      mergeProjectProgress(
        [{ key: 'goal-a', title: 'Alpha', taskCount: 1, trackedMs: HOUR }],
        plans,
      )[0].fill === 0.25,
  )
  check(
    'the list is ordered by the larger of tracked and planned time',
    merged[0].key === 'goal-a' &&
      merged[1].key === 'goal-b' &&
      merged.length === 4,
    merged.map((row) => row.key),
  )
}

export function verifyProjectPanelStats() {
  section('Project panel: habit window, streaks and time this month')

  const TODAY = '2026-10-10' as ISODate
  const daily = (id: string, goalId?: string) =>
    ({
      id,
      title: id,
      priority: 'minor',
      order: 0,
      tagIds: [],
      isActive: true,
      goalId,
      recurrence: { type: RECURRENCE_TYPE.DAILY, startDate: '2026-10-01' },
      createdAt: T0,
      updatedAt: T0,
    }) as unknown as TaskTemplate
  const doneOn = (templateId: string, dates: string[]) =>
    dates.map(
      (date) =>
        ({
          id: `${templateId}::${date}`,
          date,
          templateId,
          title: templateId,
          priority: 'minor',
          tagIds: [],
          status: 'done',
          createdAt: T0,
          updatedAt: T0,
        }) as unknown as DailyTask,
    )

  check(
    'the habit grid is 14 days beside Upcoming and 28 days when it stands alone',
    habitWindowDays(true) === 14 && habitWindowDays(false) === 28,
  )

  const HOUR_MS = 60 * 60 * 1000
  const sitting = (goalId: string, startedAt: string, minutes: number) =>
    ({
      id: `${goalId}-${startedAt}`,
      sessionId: 's',
      startedAt,
      endedAt: new Date(
        Date.parse(startedAt) + minutes * 60 * 1000,
      ).toISOString(),
      mode: 'stopwatch',
      source: 'timer',
      goalId,
    }) as unknown as TimeEntry
  const entries = [
    sitting('goal-a', '2026-10-02T09:00:00.000Z', 90),
    sitting('goal-b', '2026-10-03T09:00:00.000Z', 60),
    sitting('goal-a', '2026-09-20T09:00:00.000Z', 120),
  ]
  const now = new Date(Date.UTC(2026, 9, 10, 12))
  check(
    'time this month counts only the project asked for, and only this month',
    monthTrackedMs(entries, 'goal-a', now) === 1.5 * HOUR_MS &&
      monthTrackedMs(entries, null, now) === 2.5 * HOUR_MS,
    [
      monthTrackedMs(entries, 'goal-a', now),
      monthTrackedMs(entries, null, now),
    ],
  )

  const reading = daily('read', 'goal-a')
  const stretch = daily('stretch', 'goal-a')
  const rows = [
    ...doneOn('read', ['2026-10-08', '2026-10-09', TODAY]),
    ...doneOn('stretch', ['2026-10-08', '2026-10-09']),
  ]

  const window14 = habitWindowView({
    templates: [reading],
    dailyTasks: rows,
    days: 14,
    today: TODAY,
  })
  check(
    'the window is the last 14 days ending today, with today as the final cell',
    window14.dayTotals.length === 14 &&
      window14.dayTotals[0].date === '2026-09-27' &&
      window14.dayTotals[13].date === TODAY &&
      window14.rows[0].cells[13].state === 'done',
    window14.dayTotals.map((day) => day.date),
  )
  check(
    'a 28-day window reaches back four weeks from today',
    habitWindowView({
      templates: [reading],
      dailyTasks: rows,
      days: 28,
      today: TODAY,
    }).dayTotals[0].date === '2026-09-13',
  )

  const streaks = habitStreaks({
    templates: [reading, stretch],
    dailyTasks: rows,
    today: TODAY,
  })
  check(
    'a habit streak counts back from the last day, and an open today neither breaks nor extends it',
    streaks.get('read') === 3 && streaks.get('stretch') === 2,
    [...streaks],
  )
}
