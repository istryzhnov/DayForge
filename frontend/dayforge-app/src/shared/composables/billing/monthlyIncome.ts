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
