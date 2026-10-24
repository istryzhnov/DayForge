import type { Client, PaymentRecord } from '../../entities/BillingEntity'
import { PAYMENT_STATUS, type PaymentStatus } from '../../entities/BillingEntity'
import type { ID } from '../../entities/types'

export const CLIENT_LIMITS = {
  NAME_MAX: 80,
  EMAIL_MAX: 120,
  NOTES_MAX: 500,
  COUNT_MAX: 200,
  AMOUNT_MAX: 10_000_000,
} as const

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cappedText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

/**
 * Stored clients are re-checked on every read: names trimmed and capped, ids
 * unique, rows without a name or an id dropped. Unknown fields are kept.
 */
export function sanitizeClients(input: unknown): Client[] {
  if (!Array.isArray(input)) return []

  const seen = new Set<ID>()
  const clients: Client[] = []

  input.forEach((item) => {
    if (clients.length >= CLIENT_LIMITS.COUNT_MAX) return
    if (!isRecord(item) || typeof item.id !== 'string' || item.id === '') return
    if (seen.has(item.id)) return

    const name = cappedText(item.name, CLIENT_LIMITS.NAME_MAX)
    if (name === '') return
    seen.add(item.id)

    const client: Client = { ...item, id: item.id, name }
    const email = cappedText(item.email, CLIENT_LIMITS.EMAIL_MAX)
    const notes = cappedText(item.notes, CLIENT_LIMITS.NOTES_MAX)

    if (email !== '') client.email = email
    else delete client.email
    if (notes !== '') client.notes = notes
    else delete client.notes
    if (item.archived === true) client.archived = true
    else delete client.archived

    clients.push(client)
  })

  return clients
}

function isStatus(value: unknown): value is PaymentStatus {
  return (Object.values(PAYMENT_STATUS) as unknown[]).includes(value)
}

function isoOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
    ? value
    : undefined
}

/** Keeps one record per client and month; anything malformed is dropped. */
export function sanitizePayments(input: unknown): PaymentRecord[] {
  if (!Array.isArray(input)) return []

  const seen = new Set<string>()
  const records: PaymentRecord[] = []

  input.forEach((item) => {
    if (!isRecord(item)) return
    if (typeof item.clientId !== 'string' || item.clientId === '') return
    if (typeof item.month !== 'string' || !MONTH_PATTERN.test(item.month)) return
    if (!isStatus(item.status) || item.status === PAYMENT_STATUS.UNBILLED) return

    const key = `${item.clientId}:${item.month}`
    if (seen.has(key)) return
    seen.add(key)

    const record: PaymentRecord = {
      ...item,
      key,
      clientId: item.clientId,
      month: item.month,
      status: item.status,
    }

    const amount = item.amount
    if (
      typeof amount === 'number' &&
      Number.isFinite(amount) &&
      amount >= 0 &&
      amount <= CLIENT_LIMITS.AMOUNT_MAX
    ) {
      record.amount = amount
    } else {
      delete record.amount
    }

    const invoicedAt = isoOrUndefined(item.invoicedAt)
    const paidAt = isoOrUndefined(item.paidAt)
    if (invoicedAt) record.invoicedAt = invoicedAt
    else delete record.invoicedAt
    if (paidAt) record.paidAt = paidAt
    else delete record.paidAt

    records.push(record)
  })

  return records
}
