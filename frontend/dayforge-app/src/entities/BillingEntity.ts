import type { ID, ISODateTime } from './types'

/**
 * A customer a freelancer bills. Lives in the synced settings row (`billing`
 * section), so it travels with backups and sync without a table of its own.
 */
export interface Client {
  id: ID
  name: string
  email?: string
  notes?: string
  /** Hidden from pickers; existing projects keep pointing at it. */
  archived?: boolean
}

export const PAYMENT_STATUS = {
  UNBILLED: 'unbilled',
  INVOICED: 'invoiced',
  PAID: 'paid',
} as const

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS]

/**
 * One client's billing state for one calendar month. An unbilled month has no
 * record at all, so the list only ever holds months someone acted on.
 */
export interface PaymentRecord {
  /** `${clientId}:${month}`, so a client has at most one record per month. */
  key: string
  clientId: ID
  /** Local calendar month, `YYYY-MM`. */
  month: string
  status: PaymentStatus
  /** The invoiced sum, in the account currency. */
  amount?: number
  invoicedAt?: ISODateTime
  paidAt?: ISODateTime
}

/** The `billing` section of the synced settings row. */
export interface BillingSettings {
  clients: Client[]
  payments: PaymentRecord[]
}
