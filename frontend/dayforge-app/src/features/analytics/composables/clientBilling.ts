import type { Client, PaymentRecord, PaymentStatus } from '../../../entities/BillingEntity'
import { PAYMENT_STATUS } from '../../../entities/BillingEntity'
import type { Goal } from '../../../entities/GoalEntity'
import type { TimeEntry } from '../../../entities/TimerEntity'
import type { ID, ISODateTime } from '../../../entities/types'
import {
  NO_PROJECT_KEY,
  type PeriodRange,
} from '../../../composables/timer/analytics'
import { entryDurationMs } from '../../../composables/timer/entries'
import {
  breakdownEarnings,
  rateForTask,
  type RateLookup,
} from '../../../composables/timer/rates'
import { projectFigures, sanitizeBilling } from './projectBilling'

/** Client filter value for "every client". */
export const ALL_CLIENTS_FILTER_ID = 'all'

/** Stands for entries and projects that belong to no client. */
export const NO_CLIENT_FILTER_ID = '__no_client__'

/** An invoice unpaid for longer than this is overdue. Constant for now. */
export const OVERDUE_AFTER_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

/** The client key a project belongs to: its client's id, or the no-client key. */
export function clientKeyFor(
  goal: Pick<Goal, 'clientId'> | undefined,
  clientIds: ReadonlySet<ID>,
): string {
  const clientId = goal?.clientId
  return clientId !== undefined && clientIds.has(clientId)
    ? clientId
    : NO_CLIENT_FILTER_ID
}

export function monthKeyOf(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${date.getFullYear()}-${month}`
}

/** The month a period is billed in: the month its last moment falls in. */
export function billingMonthOf(range: PeriodRange): string {
  return monthKeyOf(new Date(range.to - 1))
}

export function paymentKey(clientId: ID, month: string): string {
  return `${clientId}:${month}`
}

export function findPayment(
  payments: PaymentRecord[],
  clientId: ID,
  month: string,
): PaymentRecord | undefined {
  const key = paymentKey(clientId, month)
  return payments.find((payment) => payment.key === key)
}

/**
 * Moves one client-month to a status. Unbilled removes the record, so the list
 * keeps only months someone acted on. Dates are stamped the first time a
 * status is reached and kept while it stays there.
 */
export function withPaymentStatus(
  payments: PaymentRecord[],
  clientId: ID,
  month: string,
  status: PaymentStatus,
  now: ISODateTime,
  amount?: number,
): PaymentRecord[] {
  const key = paymentKey(clientId, month)
  const others = payments.filter((payment) => payment.key !== key)
  if (status === PAYMENT_STATUS.UNBILLED) return others

  const existing = payments.find((payment) => payment.key === key)
  const next: PaymentRecord = {
    key,
    clientId,
    month,
    status,
  }

  const nextAmount = amount ?? existing?.amount
  if (nextAmount !== undefined) next.amount = nextAmount

  next.invoicedAt = existing?.invoicedAt ?? now
  if (status === PAYMENT_STATUS.PAID) {
    next.paidAt = existing?.paidAt ?? now
  }

  return [...others, next]
}

/** Sets or clears the amount of an existing record; no record means no change. */
export function withPaymentAmount(
  payments: PaymentRecord[],
  clientId: ID,
  month: string,
  amount: number | undefined,
): PaymentRecord[] {
  const key = paymentKey(clientId, month)
  return payments.map((payment) => {
    if (payment.key !== key) return payment
    const next = { ...payment }
    if (amount === undefined) delete next.amount
    else next.amount = amount
    return next
  })
}

export function isOverdue(payment: PaymentRecord, now: number): boolean {
  if (payment.status !== PAYMENT_STATUS.INVOICED) return false
  if (payment.invoicedAt === undefined) return false
  return now - Date.parse(payment.invoicedAt) > OVERDUE_AFTER_DAYS * DAY_MS
}

export interface OutstandingSummary {
  /** Invoiced and not paid, in the account currency. */
  total: number
  count: number
  overdueCount: number
  overdueTotal: number
  /** Invoices with no amount typed in; they add nothing to the total. */
  withoutAmountCount: number
}

export function outstandingSummary(
  payments: PaymentRecord[],
  now: number,
): OutstandingSummary {
  const summary: OutstandingSummary = {
    total: 0,
    count: 0,
    overdueCount: 0,
    overdueTotal: 0,
    withoutAmountCount: 0,
  }

  payments.forEach((payment) => {
    if (payment.status !== PAYMENT_STATUS.INVOICED) return

    const amount = payment.amount ?? 0
    summary.count += 1
    summary.total += amount
    if (payment.amount === undefined) summary.withoutAmountCount += 1

    if (isOverdue(payment, now)) {
      summary.overdueCount += 1
      summary.overdueTotal += amount
    }
  })

  summary.total = roundMoney(summary.total)
  summary.overdueTotal = roundMoney(summary.overdueTotal)
  return summary
}

export interface ClientSummaryRow {
  /** The client id, or NO_CLIENT_FILTER_ID. */
  key: string
  clientId?: ID
  title: string
  archived: boolean
  projectCount: number
  ms: number
  earned: number
  /** True when a fixed price is part of the earnings. */
  hasFixedPrice: boolean
}

export interface ClientSummaryInput {
  /** Entries inside the period, before any client filter. */
  periodEntries: TimeEntry[]
  /** Every entry, for the All time figures. */
  allEntries: TimeEntry[]
  goals: Goal[]
  clients: Client[]
  lookup: RateLookup
  isAllTime: boolean
}

function totalsMsByKey(entries: TimeEntry[]): Map<string, number> {
  const totals = new Map<string, number>()
  entries.forEach((entry) => {
    const key = entry.goalId ?? NO_PROJECT_KEY
    totals.set(key, (totals.get(key) ?? 0) + entryDurationMs(entry))
  })
  return totals
}

/**
 * Hours and earnings per client, using the same per-project figures as the
 * project table, so fixed prices and manual hours count here too.
 */
export function clientSummaries(input: ClientSummaryInput): ClientSummaryRow[] {
  const clientById = new Map(input.clients.map((client) => [client.id, client]))
  const clientIds = new Set(clientById.keys())
  const goalById = new Map(input.goals.map((goal) => [goal.id, goal]))

  const periodMs = totalsMsByKey(input.periodEntries)
  const allMs = totalsMsByKey(input.allEntries)
  const periodEarned = breakdownEarnings(input.periodEntries, input.lookup).byProject
  const allEarned = breakdownEarnings(input.allEntries, input.lookup).byProject

  const projectKeys = new Set(periodMs.keys())
  if (input.isAllTime) input.goals.forEach((goal) => projectKeys.add(goal.id))

  const totals = new Map<
    string,
    { ms: number; earned: number; projectCount: number; hasFixedPrice: boolean }
  >()

  projectKeys.forEach((key) => {
    const goal = goalById.get(key)
    const figures = projectFigures({
      periodMs: periodMs.get(key) ?? 0,
      periodEarned: periodEarned.get(key) ?? 0,
      allTimeMs: allMs.get(key) ?? 0,
      allTimeEarned: allEarned.get(key) ?? 0,
      fallbackRate: rateForTask(input.lookup, undefined, goal?.id),
      isAllTime: input.isAllTime,
      billing: sanitizeBilling(goal?.billing),
    })

    const clientKey = clientKeyFor(goal, clientIds)
    const row = totals.get(clientKey) ?? {
      ms: 0,
      earned: 0,
      projectCount: 0,
      hasFixedPrice: false,
    }
    row.ms += figures.ms
    row.earned += figures.earned
    row.projectCount += 1
    row.hasFixedPrice ||= figures.fixedBasis !== null
    totals.set(clientKey, row)
  })

  const rows: ClientSummaryRow[] = [...totals].map(([key, total]) => {
    const client = clientById.get(key)
    return {
      key,
      clientId: client?.id,
      title: client?.name ?? 'No client',
      archived: client?.archived === true,
      projectCount: total.projectCount,
      ms: total.ms,
      earned: total.earned,
      hasFixedPrice: total.hasFixedPrice,
    }
  })

  return rows.sort(
    (a, b) =>
      b.earned - a.earned || b.ms - a.ms || a.title.localeCompare(b.title),
  )
}
