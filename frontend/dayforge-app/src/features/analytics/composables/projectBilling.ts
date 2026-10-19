import type { Goal } from '../../../entities/GoalEntity'

/**
 * Analytics-only figures a freelancer sets per project. They never touch time
 * entries, the timer or tasks; they only change what Analytics reports.
 */
export type ProjectBilling = NonNullable<Goal['billing']>

export const BILLING_LIMITS = {
  FIXED_PRICE_MAX: 10_000_000,
  MANUAL_HOURS_MAX: 100_000,
  NOTE_MAX_LENGTH: 500,
} as const

export const FIXED_BASIS = {
  /** The whole fixed price, shown in All time. */
  FIXED: 'fixed',
  /** The fixed price split by this period's share of tracked time. */
  PRORATA: 'prorata',
} as const

export type FixedBasis = (typeof FIXED_BASIS)[keyof typeof FIXED_BASIS]

const HOUR_MS = 60 * 60 * 1000

export interface BillingDraft {
  fixedPrice: string
  manualHours: string
  note: string
}

export type BillingParseResult =
  | { ok: true; billing: ProjectBilling | undefined }
  | { ok: false; error: string }

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isInRange(value: number, max: number): boolean {
  return value >= 0 && value <= max
}

export function isEmptyBilling(billing: ProjectBilling): boolean {
  return (
    billing.fixedPrice === undefined &&
    billing.manualHours === undefined &&
    billing.note === undefined
  )
}

/**
 * Stored values are checked again on read, since a row may come from another
 * build or a hand-edited backup. Anything out of range is dropped, not clamped.
 */
export function sanitizeBilling(raw: unknown): ProjectBilling | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined

  const source = raw as Record<string, unknown>
  const billing: ProjectBilling = {}

  if (
    isFiniteNumber(source.fixedPrice) &&
    isInRange(source.fixedPrice, BILLING_LIMITS.FIXED_PRICE_MAX)
  ) {
    billing.fixedPrice = source.fixedPrice
  }

  if (
    isFiniteNumber(source.manualHours) &&
    isInRange(source.manualHours, BILLING_LIMITS.MANUAL_HOURS_MAX)
  ) {
    billing.manualHours = source.manualHours
  }

  if (typeof source.note === 'string') {
    const note = source.note.trim().slice(0, BILLING_LIMITS.NOTE_MAX_LENGTH)
    if (note !== '') billing.note = note
  }

  return isEmptyBilling(billing) ? undefined : billing
}

/** Parses a number field: empty means "not set", anything else must be a valid number. */
function parseNumberField(
  text: string,
  max: number,
  label: string,
): { value?: number; error?: string } {
  const trimmed = text.trim().replace(',', '.')
  if (trimmed === '') return {}

  const value = Number(trimmed)
  if (!isFiniteNumber(value) || !isInRange(value, max)) {
    return {
      error: `${label} must be a number from 0 to ${max.toLocaleString('en-US')}.`,
    }
  }
  return { value }
}

/** Turns the dialog's text fields into a billing record, or says what is wrong. */
export function parseBillingDraft(draft: BillingDraft): BillingParseResult {
  const price = parseNumberField(
    draft.fixedPrice,
    BILLING_LIMITS.FIXED_PRICE_MAX,
    'Fixed price',
  )
  if (price.error) return { ok: false, error: price.error }

  const hours = parseNumberField(
    draft.manualHours,
    BILLING_LIMITS.MANUAL_HOURS_MAX,
    'Hours',
  )
  if (hours.error) return { ok: false, error: hours.error }

  const note = draft.note.trim()
  if (note.length > BILLING_LIMITS.NOTE_MAX_LENGTH) {
    return {
      ok: false,
      error: `The note can be at most ${BILLING_LIMITS.NOTE_MAX_LENGTH} characters.`,
    }
  }

  const billing: ProjectBilling = {}
  if (price.value !== undefined) billing.fixedPrice = price.value
  if (hours.value !== undefined) billing.manualHours = hours.value
  if (note !== '') billing.note = note

  return {
    ok: true,
    billing: isEmptyBilling(billing) ? undefined : billing,
  }
}

export function draftFromBilling(billing: ProjectBilling | undefined): BillingDraft {
  return {
    fixedPrice:
      billing?.fixedPrice !== undefined ? String(billing.fixedPrice) : '',
    manualHours:
      billing?.manualHours !== undefined ? String(billing.manualHours) : '',
    note: billing?.note ?? '',
  }
}

/** Whether two billing records hold the same figures, so a save can be a no-op. */
export function sameBilling(
  left: ProjectBilling | undefined,
  right: ProjectBilling | undefined,
): boolean {
  if (!left || !right) return left === right
  return (
    left.fixedPrice === right.fixedPrice &&
    left.manualHours === right.manualHours &&
    left.note === right.note
  )
}

export interface ProjectFigureInput {
  /** Tracked time inside the shown period, in ms. */
  periodMs: number
  /** Hourly earnings inside the shown period (per-task rates already applied). */
  periodEarned: number
  /** Tracked time over all time, in ms. */
  allTimeMs: number
  /** Hourly earnings over all time. */
  allTimeEarned: number
  /** Rate used to price manual hours when the project has no tracked time. */
  fallbackRate: number
  isAllTime: boolean
  billing?: ProjectBilling
}

export interface ProjectFigures {
  /** Hours shown, in ms. */
  ms: number
  earned: number
  /** Earned / hours, or null when there are no hours. */
  effectiveRate: number | null
  /** Set when the fixed price is what the earnings show. */
  fixedBasis: FixedBasis | null
  /** True when the manual hours replaced the tracked hours. */
  manualHours: boolean
}

/**
 * Lifetime adjustments applied to one period's numbers.
 *
 * All time: manual hours replace tracked hours, and a fixed price replaces the
 * hourly earnings. Manual hours without a fixed price are priced at the
 * project's blended rate (or its own rate when nothing was tracked).
 *
 * Shorter periods: hours stay as tracked. A fixed price is pro-rated by this
 * period's share of all tracked time, and is zero when nothing was ever tracked.
 */
export function projectFigures(input: ProjectFigureInput): ProjectFigures {
  const fixedPrice = input.billing?.fixedPrice
  const manual = input.billing?.manualHours

  if (!input.isAllTime) {
    const ms = input.periodMs

    if (fixedPrice === undefined) {
      return withRate(ms, input.periodEarned, null, false)
    }

    if (input.allTimeMs <= 0) {
      return withRate(ms, 0, null, false)
    }

    const share = input.periodMs / input.allTimeMs
    return withRate(ms, fixedPrice * share, FIXED_BASIS.PRORATA, false)
  }

  const ms = manual !== undefined ? manual * HOUR_MS : input.allTimeMs
  const manualApplied = manual !== undefined

  if (fixedPrice !== undefined) {
    return withRate(ms, fixedPrice, FIXED_BASIS.FIXED, manualApplied)
  }

  if (!manualApplied) {
    return withRate(ms, input.allTimeEarned, null, false)
  }

  const blendedRate =
    input.allTimeMs > 0
      ? input.allTimeEarned / (input.allTimeMs / HOUR_MS)
      : input.fallbackRate

  return withRate(ms, (ms / HOUR_MS) * blendedRate, null, true)
}

function withRate(
  ms: number,
  earned: number,
  fixedBasis: FixedBasis | null,
  manualHours: boolean,
): ProjectFigures {
  return {
    ms,
    earned,
    effectiveRate: ms > 0 ? earned / (ms / HOUR_MS) : null,
    fixedBasis,
    manualHours,
  }
}
