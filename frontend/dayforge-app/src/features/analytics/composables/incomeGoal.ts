export const INCOME_GOAL_MAX = 10_000_000

/** Stored monthly goals are re-checked on read: a positive, finite amount or nothing. */
export function sanitizeMonthlyIncome(raw: unknown): number | undefined {
  return typeof raw === 'number' &&
    Number.isFinite(raw) &&
    raw > 0 &&
    raw <= INCOME_GOAL_MAX
    ? raw
    : undefined
}

export const INCOME_STATE = {
  /** No goal set. */
  NONE: 'none',
  /** Earned already reaches the goal. */
  REACHED: 'reached',
  /** The month's pace reaches the goal. */
  ON_TRACK: 'on-track',
  /** The month's pace falls short of the goal. */
  BEHIND: 'behind',
  /** No working day has passed yet, so there is no pace to project. */
  PENDING: 'pending',
} as const

export type IncomeState = (typeof INCOME_STATE)[keyof typeof INCOME_STATE]

/** Mon–Fri: the working week the forecast assumes, whatever the calendar shows. */
export function isWorkingDay(date: Date): boolean {
  const weekday = date.getDay()
  return weekday >= 1 && weekday <= 5
}

/** Working days in the month of `now`. */
export function workingDaysInMonth(now: Date): number {
  const year = now.getFullYear()
  const month = now.getMonth()
  const lastDay = new Date(year, month + 1, 0).getDate()

  let count = 0
  for (let day = 1; day <= lastDay; day += 1) {
    if (isWorkingDay(new Date(year, month, day))) count += 1
  }
  return count
}

/** Working days from the 1st of the month of `now` through `now` itself. */
export function elapsedWorkingDays(now: Date): number {
  const year = now.getFullYear()
  const month = now.getMonth()

  let count = 0
  for (let day = 1; day <= now.getDate(); day += 1) {
    if (isWorkingDay(new Date(year, month, day))) count += 1
  }
  return count
}

/** Working days from `now` through the end of its month, today included. */
export function workingDaysLeft(now: Date): number {
  const year = now.getFullYear()
  const month = now.getMonth()
  const lastDay = new Date(year, month + 1, 0).getDate()

  let count = 0
  for (let day = now.getDate(); day <= lastDay; day += 1) {
    if (isWorkingDay(new Date(year, month, day))) count += 1
  }
  return count
}

/**
 * What each remaining working day has to bring in to reach the goal. Null when
 * the goal is already met or no working day is left to earn it in.
 */
export function amountPerDayNeeded(
  goal: number,
  earned: number,
  daysLeft: number,
): number | null {
  if (earned >= goal || daysLeft <= 0) return null
  return (goal - earned) / daysLeft
}

export interface IncomeGoalStatus {
  goal: number
  earned: number
  /** Earned over the goal, as a fraction. */
  fraction: number
  elapsedWorkingDays: number
  totalWorkingDays: number
  /** Earned so far, scaled to the month's working days. Null before the first working day. */
  forecast: number | null
  /** Shortfall of the forecast against the goal; zero when on track. */
  behindBy: number
  state: IncomeState
}

export function incomeGoalStatus(
  goal: number | undefined,
  earned: number,
  now: Date,
): IncomeGoalStatus | null {
  if (goal === undefined) return null

  const elapsed = elapsedWorkingDays(now)
  const total = workingDaysInMonth(now)
  const fraction = earned / goal

  if (earned >= goal) {
    return {
      goal,
      earned,
      fraction,
      elapsedWorkingDays: elapsed,
      totalWorkingDays: total,
      forecast: null,
      behindBy: 0,
      state: INCOME_STATE.REACHED,
    }
  }

  if (elapsed === 0) {
    return {
      goal,
      earned,
      fraction,
      elapsedWorkingDays: elapsed,
      totalWorkingDays: total,
      forecast: null,
      behindBy: 0,
      state: INCOME_STATE.PENDING,
    }
  }

  const forecast = (earned / elapsed) * total
  const behindBy = Math.max(0, goal - forecast)

  return {
    goal,
    earned,
    fraction,
    elapsedWorkingDays: elapsed,
    totalWorkingDays: total,
    forecast,
    behindBy,
    state: behindBy > 0 ? INCOME_STATE.BEHIND : INCOME_STATE.ON_TRACK,
  }
}
