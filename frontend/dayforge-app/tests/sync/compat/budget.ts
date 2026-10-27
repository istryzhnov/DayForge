/** Compat checks: project budgets, plan vs actual and the monthly income goal. */

import { mergeRow } from '../../../src/sync/merge'
import { SYNC_TABLE } from '../../../src/sync/types'
import { heldFromRow, SYNCED_SECTIONS } from '../../../src/composables/settingsRow'
import { DEFAULT_SETTINGS } from '../../../src/composables/useSettings'
import { parseBackupFile } from '../../../src/features/settings/composables/backupFormat'
import type { Goal } from '../../../src/entities/GoalEntity'
import type { DailyTask, TaskTemplate } from '../../../src/entities/TaskEntity'
import {
  budgetLevelOf,
  budgetStanding,
  budgetStandingOf,
  isLevelUp,
  parseBudgetDraft,
  sanitizeBudget,
} from '../../../src/features/analytics/composables/projectBudget'
import { projectEarnings, totalEarned } from '../../../src/features/analytics/composables/projectEarnings'
import {
  blockDurationMs,
  planBounds,
  plannedMsByProject,
  planVsActual,
} from '../../../src/features/analytics/composables/planVsActual'
import {
  elapsedWorkingDays,
  incomeGoalStatus,
  sanitizeMonthlyIncome,
  workingDaysInMonth,
} from '../../../src/features/analytics/composables/incomeGoal'
import { buildRateLookup } from '../../../src/composables/timer/rates'
import { formatHoursMinutes } from '../../../src/composables/timer/format'
import { ANALYTICS_PERIOD, NO_PROJECT_KEY } from '../../../src/composables/timer/analytics'
import { RECURRENCE_TYPE, TIME_ENTRY_SOURCE, TIMER_MODE } from '../../../src/entities/constants'
import type { TimeEntry } from '../../../src/entities/TimerEntity'
import { T0, T1, check, clone, goalRow, same, section } from './harness'

/** Budget, plan vs actual and the monthly income goal: sync, backup and the math. */
export function verifyBudgetPlanIncome() {
  section('Project budget, plan vs actual and monthly income goal')

  const HOUR = 60 * 60 * 1000
  const MIN = 60 * 1000
  const near = (left: number, right: number) => Math.abs(left - right) < 1e-9

  const budgeted = goalRow({
    id: 'goal-f',
    budget: { hours: 20, amount: 1500, period: 'month' },
    updatedAt: T1,
  })
  const unbudgeted = goalRow({ id: 'goal-f', updatedAt: T0 })

  check(
    'a budget survives a whole-row merge in either direction',
    same(mergeRow(SYNC_TABLE.GOALS, unbudgeted, budgeted).row.budget, budgeted.budget) &&
      same(mergeRow(SYNC_TABLE.GOALS, budgeted, unbudgeted).row.budget, budgeted.budget),
  )

  const budgetBackup = parseBackupFile({
    format: 'dayforge-backup',
    version: 1,
    goals: [clone(budgeted)],
    taskTemplates: [],
    dailyTasks: [],
  })
  check(
    'a budget survives a backup round trip',
    budgetBackup !== null && same(budgetBackup.goals[0].budget, budgeted.budget),
  )

  check(
    'the income goal is a synced settings section',
    (SYNCED_SECTIONS as readonly string[]).includes('goals') &&
      DEFAULT_SETTINGS.goals.monthlyIncome === undefined &&
      'monthlyIncome' in DEFAULT_SETTINGS.goals,
  )
  const settingsRemote: Record<string, unknown> = {
    id: 'settings',
    updatedAt: T1,
    ...clone(DEFAULT_SETTINGS),
    goals: { monthlyIncome: 3000 },
  }
  check(
    'a monthly income goal from another device is read as a known section',
    !('goals' in heldFromRow(settingsRemote, SYNCED_SECTIONS, DEFAULT_SETTINGS)),
  )

  check(
    'a budget keeps valid limits and its period',
    same(sanitizeBudget({ hours: 20, amount: 1500, period: 'month' }), { hours: 20, amount: 1500, period: 'month' }),
  )
  check(
    'a budget drops limits out of range',
    sanitizeBudget({ hours: -1, amount: 1e9, period: 'month' }) === undefined,
  )
  check(
    'a budget with one limit left keeps just that limit',
    same(sanitizeBudget({ hours: 5, amount: 0, period: 'month' }), { hours: 5, period: 'month' }),
  )
  check(
    'a budget with no limit is no budget, and an unknown period is the whole project',
    sanitizeBudget({ period: 'total' }) === undefined &&
      sanitizeBudget('x') === undefined &&
      sanitizeBudget({ hours: 5, period: 'year' })?.period === 'total',
  )

  const emptyBudget = parseBudgetDraft({ hours: '', amount: ' ', period: 'total' })
  check('an empty budget draft means no budget', emptyBudget.ok && emptyBudget.budget === undefined)
  const commaBudget = parseBudgetDraft({ hours: '12,5', amount: '', period: 'month' })
  check('a comma decimal is read as a point in a budget', commaBudget.ok && commaBudget.budget?.hours === 12.5)
  check(
    'a zero or negative budget limit is refused',
    !parseBudgetDraft({ hours: '0', amount: '', period: 'total' }).ok &&
      !parseBudgetDraft({ hours: '', amount: '-3', period: 'total' }).ok,
  )

  check(
    'the warning lines sit at 80% and 100%',
    budgetLevelOf(0.79) === 'ok' && budgetLevelOf(0.8) === 'warn' && budgetLevelOf(0.99) === 'warn' && budgetLevelOf(1) === 'over',
  )

  const hoursOnly = budgetStanding({ hours: 20, period: 'total' }, { trackedMs: 16 * HOUR, earned: 0 })
  check(
    'hours progress is tracked time over the limit',
    near(hoursOnly.fraction, 0.8) && hoursOnly.level === 'warn' && hoursOnly.amountFraction === null,
  )
  const bothLimits = budgetStanding(
    { hours: 20, amount: 1000, period: 'total' },
    { trackedMs: 5 * HOUR, earned: 900 },
  )
  check(
    'with both limits the larger fraction decides',
    near(bothLimits.fraction, 0.9) && bothLimits.level === 'warn' && near(bothLimits.hoursFraction ?? 0, 0.25),
  )
  const moneyOver = budgetStanding({ amount: 1000, period: 'total' }, { trackedMs: 0, earned: 1100 })
  check('earnings past the money limit are over budget', near(moneyOver.fraction, 1.1) && moneyOver.level === 'over')

  check(
    'a notice fires only when the level goes up',
    isLevelUp(undefined, 'warn') &&
      isLevelUp('warn', 'over') &&
      !isLevelUp('warn', 'warn') &&
      !isLevelUp('over', 'warn') &&
      !isLevelUp(undefined, 'ok'),
  )

  // Oct 25 2026: the monthly scope counts only October's time.
  const now = new Date(2026, 9, 25, 12)
  const entryOn = (id: string, when: Date, hours: number): TimeEntry => ({
    id,
    sessionId: `session-${id}`,
    startedAt: new Date(when.getTime()).toISOString(),
    endedAt: new Date(when.getTime() + hours * HOUR).toISOString(),
    mode: TIMER_MODE.STOPWATCH,
    goalId: 'goal-b',
    source: TIME_ENTRY_SOURCE.TIMER,
    updatedAt: T1,
  })
  const lastMonthEntry = entryOn('sep', new Date(2026, 8, 20, 9), 8)
  const thisMonthEntry = entryOn('oct', new Date(2026, 9, 10, 9), 2)
  const goalB = goalRow({ id: 'goal-b', title: 'Brand', budget: { hours: 5, period: 'month' } }) as unknown as Goal
  const context = {
    allEntries: [lastMonthEntry, thisMonthEntry],
    goals: [goalB],
    lookup: buildRateLookup([], [goalB], 50),
    now,
  }

  const monthly = budgetStandingOf(goalB, context)
  check('a monthly budget counts only this month', monthly !== null && near(monthly.fraction, 0.4) && monthly.level === 'ok')
  const total = budgetStandingOf({ ...goalB, budget: { hours: 5, period: 'total' } }, context)
  check('a total budget counts everything tracked', total !== null && near(total.fraction, 2) && total.level === 'over')
  check('no budget means no standing', budgetStandingOf({ ...goalB, budget: undefined }, context) === null)

  const priced = { ...goalB, budget: undefined, billing: { fixedPrice: 1000 } } as Goal
  const pricedMonth = projectEarnings({
    allEntries: [lastMonthEntry, thisMonthEntry],
    periodEntries: [thisMonthEntry],
    goals: [priced],
    lookup: buildRateLookup([], [priced], 50),
    isAllTime: false,
  })
  check('month earnings pro-rate a fixed price by the tracked share', near(totalEarned(pricedMonth), 200))

  check('a 45-minute block counts its real length', blockDurationMs('09:00', '09:45', 60) === 45 * MIN)
  check('a block with only a start uses the calendar default', blockDurationMs('12:00', undefined, 60) === 60 * MIN)
  check('a block without a start is not on the grid', blockDurationMs(undefined, '10:00', 60) === 0)
  check('a block that ends before it starts counts for nothing', blockDurationMs('10:00', '09:00', 60) === 0)

  const tpl = (id: string, overrides: Record<string, unknown>) =>
    ({ id, title: id, priority: 'minor', order: 0, tagIds: [], isActive: true, createdAt: T0, updatedAt: T0, ...overrides }) as TaskTemplate
  const standup = tpl('standup', {
    goalId: 'goal-a',
    startTime: '09:00',
    endTime: '10:30',
    recurrence: { type: RECURRENCE_TYPE.DAILY, startDate: '2026-10-01' },
  })
  const review = tpl('review', {
    goalId: 'goal-a',
    startTime: '10:00',
    endTime: '11:00',
    recurrence: { type: RECURRENCE_TYPE.WEEKLY, daysOfWeek: [1, 3], startDate: '2026-10-01' },
  })
  const errand = tpl('errand', {
    startTime: '12:00',
    recurrence: { type: RECURRENCE_TYPE.NONE, startDate: '2026-10-20' },
  })
  const retired = tpl('retired', {
    goalId: 'goal-a',
    startTime: '08:00',
    endTime: '11:00',
    isActive: false,
    recurrence: { type: RECURRENCE_TYPE.DAILY, startDate: '2026-10-01' },
  })
  // A day row replaces the repeat's projection on its date: 14 Oct is a Wednesday.
  const movedReview = {
    id: 'review::2026-10-14',
    date: '2026-10-14',
    goalId: 'goal-a',
    templateId: 'review',
    title: 'review',
    priority: 'minor',
    tagIds: [],
    status: 'todo',
    startTime: '14:00',
    endTime: '15:30',
  } as DailyTask

  const plan = plannedMsByProject(
    { templates: [standup, review, errand, retired], dailyTasks: [movedReview], defaultDurationMinutes: 60 },
    '2026-10-01',
    '2026-10-31',
  )
  // Standup: 31 days x 90 min. Review: 8 Mon/Wed x 60 min, with 14 Oct at 90 min from its row.
  check('planned time adds repeats and day rows without counting a day twice', plan.get('goal-a') === (31 * 90 + 7 * 60 + 90) * MIN)
  check('a one-off block with no end uses the default length, no project', plan.get(NO_PROJECT_KEY) === 60 * MIN)
  check('an inactive task is not planned', plan.get('goal-a') === 3300 * MIN)
  check('a range that stops early counts only its days', plannedMsByProject(
    { templates: [standup], dailyTasks: [], defaultDurationMinutes: 60 },
    '2026-10-01',
    '2026-10-07',
  ).get('goal-a') === 7 * 90 * MIN)

  check('this month plans from the 1st up to today, not the month end', same(planBounds(ANALYTICS_PERIOD.THIS_MONTH, '2026-10-25', null), { from: '2026-10-01', to: '2026-10-25' }))
  check('this month early on stops at today too', same(planBounds(ANALYTICS_PERIOD.THIS_MONTH, '2026-10-05', null), { from: '2026-10-01', to: '2026-10-05' }))
  check('last month plans the whole previous month', same(planBounds(ANALYTICS_PERIOD.LAST_MONTH, '2026-10-25', null), { from: '2026-09-01', to: '2026-09-30' }))
  check('this week runs Monday to Sunday', same(planBounds(ANALYTICS_PERIOD.THIS_WEEK, '2026-10-25', null), { from: '2026-10-19', to: '2026-10-25' }))
  check('this week mid-week stops at today', same(planBounds(ANALYTICS_PERIOD.THIS_WEEK, '2026-10-21', null), { from: '2026-10-19', to: '2026-10-21' }))
  check('all time runs from the first day to today', same(planBounds(ANALYTICS_PERIOD.ALL, '2026-10-25', '2026-08-03'), { from: '2026-08-03', to: '2026-10-25' }))
  check('all time with nothing recorded is today alone', same(planBounds(ANALYTICS_PERIOD.ALL, '2026-10-25', null), { from: '2026-10-25', to: '2026-10-25' }))

  const goalA = goalRow({ id: 'goal-a', title: 'Work' }) as unknown as Goal
  const underPlan = planVsActual(
    new Map([['goal-a', 3300 * MIN]]),
    [{ goalId: 'goal-a', title: 'Work', totalMs: 3000 * MIN, taskCount: 2 }],
    [goalA],
  )
  const rowA = underPlan.rows.find((row) => row.key === 'goal-a')
  check(
    'a project under its plan shows the shortfall and its share',
    rowA !== undefined && rowA.diffMs === -300 * MIN && rowA.state === 'under' && near(rowA.percent ?? 0, (-300 / 3300) * 100),
  )

  const withUnplanned = planVsActual(
    new Map([['goal-a', 3300 * MIN]]),
    [
      { goalId: 'goal-a', title: 'Work', totalMs: 3300 * MIN, taskCount: 2 },
      { title: 'Without a project', totalMs: 30 * MIN, taskCount: 1 },
    ],
    [goalA],
  )
  check('a project exactly on plan reads as on plan', withUnplanned.rows.find((row) => row.key === 'goal-a')?.state === 'on')
  const stray = withUnplanned.rows.find((row) => row.key === NO_PROJECT_KEY)
  check('time on a project with no plan is unplanned, with no percent', stray?.state === 'unplanned' && stray.percent === null)
  check(
    'the overall line sums both and reads over plan',
    withUnplanned.total.plannedMs === 3300 * MIN && withUnplanned.total.actualMs === 3330 * MIN && withUnplanned.total.state === 'over',
  )

  const tiny = planVsActual(
    new Map([['goal-a', 3300 * MIN]]),
    [
      { goalId: 'goal-a', title: 'Work', totalMs: 3300 * MIN, taskCount: 2 },
      { title: 'Without a project', totalMs: 30 * 1000, taskCount: 1 },
    ],
    [goalA],
  )
  check('a sub-minute project with no plan is not listed', !tiny.rows.some((row) => row.key === NO_PROJECT_KEY))
  check('a sub-minute project still counts in the overall line', tiny.total.actualMs === 3300 * MIN + 30 * 1000)
  const plannedTiny = planVsActual(
    new Map([['goal-a', 60 * MIN]]),
    [{ goalId: 'goal-a', title: 'Work', totalMs: 30 * 1000, taskCount: 1 }],
    [goalA],
  )
  check('a sub-minute project that has a plan stays listed', plannedTiny.rows.some((row) => row.key === 'goal-a'))

  check('formatHoursMinutes: nothing, or under a minute, reads 0 m', formatHoursMinutes(0) === '0 m' && formatHoursMinutes(59 * 1000) === '0 m')
  check('formatHoursMinutes: under an hour shows minutes only', formatHoursMinutes(45 * MIN) === '45 m')
  check('formatHoursMinutes: a whole hour drops the minutes', formatHoursMinutes(60 * MIN) === '1 h')
  check('formatHoursMinutes: hours and minutes', formatHoursMinutes(12.5 * HOUR) === '12 h 30 m')
  check('formatHoursMinutes: 89.99 minutes rounds to 1 h 30 m', formatHoursMinutes(89.99 * MIN) === '1 h 30 m')
  check('formatHoursMinutes: 59.6 minutes carries into the hour', formatHoursMinutes(59.6 * MIN) === '1 h')

  check('working days in October 2026 are Monday to Friday', workingDaysInMonth(now) === 22)
  check('17 working days have passed by 25 October', elapsedWorkingDays(now) === 17)

  const behind = incomeGoalStatus(3000, 1700, now)
  check(
    'the pace projects earnings across the working days',
    behind !== null && near(behind.forecast ?? 0, 2200) && behind.state === 'behind' && near(behind.behindBy, 800),
  )
  check('a pace that reaches the goal is on track', incomeGoalStatus(3000, 2500, now)?.state === 'on-track')
  check('earnings past the goal say so', incomeGoalStatus(3000, 3100, now)?.state === 'reached')
  check('no goal means no status', incomeGoalStatus(undefined, 100, now) === null)
  check('before the first working day there is no pace yet', incomeGoalStatus(3000, 0, new Date(2026, 10, 1, 12))?.state === 'pending')
  check(
    'a monthly goal is kept only when it is a positive, finite amount',
    sanitizeMonthlyIncome(3000) === 3000 &&
      sanitizeMonthlyIncome(0) === undefined &&
      sanitizeMonthlyIncome(-5) === undefined &&
      sanitizeMonthlyIncome('3000') === undefined &&
      sanitizeMonthlyIncome(Number.NaN) === undefined &&
      sanitizeMonthlyIncome(10_000_001) === undefined,
  )
}
