import type { Goal } from '../../../entities/GoalEntity'
import type { TimeEntry } from '../../../entities/TimerEntity'
import {
  ANALYTICS_PERIOD,
  entriesInRange,
  periodRange,
} from '../../../composables/timer/analytics'
import type { RateLookup } from '../../../composables/timer/rates'
import { projectEarnings } from './projectEarnings'

/** A project's spend limit, as stored on the goal. */
export type ProjectBudget = NonNullable<Goal['budget']>

export const BUDGET_PERIOD = {
  /** Everything tracked since the project began. */
  TOTAL: 'total',
  /** The current calendar month only. */
  MONTH: 'month',
} as const

export type BudgetPeriod = (typeof BUDGET_PERIOD)[keyof typeof BUDGET_PERIOD]

export const BUDGET_LEVEL = {
  OK: 'ok',
  /** At or past 80% of the budget. */
  WARN: 'warn',
  /** At or past the budget. */
  OVER: 'over',
} as const

export type BudgetLevel = (typeof BUDGET_LEVEL)[keyof typeof BUDGET_LEVEL]

export const BUDGET_THRESHOLD = {
  WARN: 0.8,
  OVER: 1,
} as const

export const BUDGET_LIMITS = {
  HOURS_MAX: 100_000,
  AMOUNT_MAX: 10_000_000,
} as const

const LEVEL_RANK: Record<BudgetLevel, number> = {
  [BUDGET_LEVEL.OK]: 0,
  [BUDGET_LEVEL.WARN]: 1,
  [BUDGET_LEVEL.OVER]: 2,
}

const HOUR_MS = 60 * 60 * 1000

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Stored budgets are re-checked on read. A limit outside its range is dropped;
 * a budget with no limit left is no budget at all.
 */
export function sanitizeBudget(raw: unknown): ProjectBudget | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const source = raw as Record<string, unknown>

  const budget: ProjectBudget = {
    period: source.period === BUDGET_PERIOD.MONTH ? BUDGET_PERIOD.MONTH : BUDGET_PERIOD.TOTAL,
  }

  if (
    isFiniteNumber(source.hours) &&
    source.hours > 0 &&
    source.hours <= BUDGET_LIMITS.HOURS_MAX
  ) {
    budget.hours = source.hours
  }

  if (
    isFiniteNumber(source.amount) &&
    source.amount > 0 &&
    source.amount <= BUDGET_LIMITS.AMOUNT_MAX
  ) {
    budget.amount = source.amount
  }

  return budget.hours === undefined && budget.amount === undefined
    ? undefined
    : budget
}

export interface BudgetDraft {
  hours: string
  amount: string
  period: BudgetPeriod
}

export type BudgetParseResult =
  | { ok: true; budget: ProjectBudget | undefined }
  | { ok: false; error: string }

/** Empty fields mean "no limit of this kind"; a set field must be a positive number. */
function parseLimit(
  text: string | number,
  max: number,
  label: string,
): { value?: number; error?: string } {
  const trimmed = String(text).trim().replace(',', '.')
  if (trimmed === '') return {}

  const value = Number(trimmed)
  if (!isFiniteNumber(value) || value <= 0 || value > max) {
    return {
      error: `${label} must be a number above 0 and up to ${max.toLocaleString('en-US')}.`,
    }
  }
  return { value }
}

export function parseBudgetDraft(draft: BudgetDraft): BudgetParseResult {
  const hours = parseLimit(draft.hours, BUDGET_LIMITS.HOURS_MAX, 'Hours budget')
  if (hours.error) return { ok: false, error: hours.error }

  const amount = parseLimit(draft.amount, BUDGET_LIMITS.AMOUNT_MAX, 'Money budget')
  if (amount.error) return { ok: false, error: amount.error }

  const budget: ProjectBudget = { period: draft.period }
  if (hours.value !== undefined) budget.hours = hours.value
  if (amount.value !== undefined) budget.amount = amount.value

  return {
    ok: true,
    budget: budget.hours === undefined && budget.amount === undefined ? undefined : budget,
  }
}

export function draftFromBudget(budget: ProjectBudget | undefined): BudgetDraft {
  return {
    hours: budget?.hours !== undefined ? String(budget.hours) : '',
    amount: budget?.amount !== undefined ? String(budget.amount) : '',
    period: budget?.period ?? BUDGET_PERIOD.TOTAL,
  }
}

export function sameBudget(
  left: ProjectBudget | undefined,
  right: ProjectBudget | undefined,
): boolean {
  if (!left || !right) return left === right
  return (
    left.hours === right.hours &&
    left.amount === right.amount &&
    left.period === right.period
  )
}

export interface BudgetUsage {
  /** Tracked time in the budget's period, in ms. */
  trackedMs: number
  /** Adjusted earnings in the budget's period (fixed price pro-rated as in Analytics). */
  earned: number
}

export interface BudgetStanding {
  budget: ProjectBudget
  usage: BudgetUsage
  /** Tracked hours over the hours limit, as a fraction; null without an hours limit. */
  hoursFraction: number | null
  /** Earnings over the money limit, as a fraction; null without a money limit. */
  amountFraction: number | null
  /** The larger of the set fractions: the figure the warnings follow. */
  fraction: number
  level: BudgetLevel
}

export function budgetLevelOf(fraction: number): BudgetLevel {
  if (fraction >= BUDGET_THRESHOLD.OVER) return BUDGET_LEVEL.OVER
  if (fraction >= BUDGET_THRESHOLD.WARN) return BUDGET_LEVEL.WARN
  return BUDGET_LEVEL.OK
}

/** Whether moving from one level to another is worth a notice: only upward. */
export function isLevelUp(from: BudgetLevel | undefined, to: BudgetLevel): boolean {
  return LEVEL_RANK[to] > LEVEL_RANK[from ?? BUDGET_LEVEL.OK]
}

export function budgetStanding(
  budget: ProjectBudget,
  usage: BudgetUsage,
): BudgetStanding {
  const hoursFraction =
    budget.hours !== undefined ? usage.trackedMs / HOUR_MS / budget.hours : null
  const amountFraction =
    budget.amount !== undefined ? usage.earned / budget.amount : null

  const fractions = [hoursFraction, amountFraction].filter(
    (value): value is number => value !== null,
  )
  const fraction = fractions.length > 0 ? Math.max(...fractions) : 0

  return {
    budget,
    usage,
    hoursFraction,
    amountFraction,
    fraction,
    level: budgetLevelOf(fraction),
  }
}

export interface BudgetContext {
  allEntries: TimeEntry[]
  goals: Goal[]
  lookup: RateLookup
  now: Date
}

/**
 * Where a project stands against its budget right now. Null when it has none.
 * The month scope counts only the calendar month of `now`.
 */
export function budgetStandingOf(
  goal: Goal,
  context: BudgetContext,
): BudgetStanding | null {
  const budget = sanitizeBudget(goal.budget)
  if (!budget) return null

  const isAllTime = budget.period === BUDGET_PERIOD.TOTAL
  const periodEntries = isAllTime
    ? context.allEntries
    : entriesInRange(
        context.allEntries,
        periodRange(ANALYTICS_PERIOD.THIS_MONTH, context.now),
      )

  const earnings = projectEarnings({
    allEntries: context.allEntries,
    periodEntries,
    goals: context.goals,
    lookup: context.lookup,
    isAllTime,
  }).get(goal.id)

  return budgetStanding(budget, {
    trackedMs: earnings?.trackedMs ?? 0,
    earned: earnings?.figures.earned ?? 0,
  })
}
