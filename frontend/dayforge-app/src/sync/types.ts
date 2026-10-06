import type { ID, ISODateTime } from '../entities/types'

/** The tables that travel between devices. Device-local state is not here. */
export const SYNC_TABLE = {
  GOALS: 'goals',
  TASK_TEMPLATES: 'task_templates',
  DAILY_TASKS: 'daily_tasks',
  TIME_ENTRIES: 'time_entries',
  SETTINGS: 'settings',
} as const

export type TableName = (typeof SYNC_TABLE)[keyof typeof SYNC_TABLE]

export const SYNC_TABLES: TableName[] = Object.values(SYNC_TABLE)

export const OPTIONAL_SYNC_TABLES: TableName[] = [SYNC_TABLE.SETTINGS]

/** A row as it travels: the app's own shape plus the stamps sync needs. */
export interface SyncedRow {
  id: ID
  updatedAt?: ISODateTime
  createdAt?: ISODateTime
  [key: string]: unknown
}

/**
 * A deletion, kept so another device cannot hand the row back. The payload is
 * the row as it was, which is what makes an undo exact rather than approximate.
 */
export interface Tombstone {
  table: TableName
  id: ID
  deletedAt: ISODateTime
  payload?: SyncedRow
}

export type MutationOp = 'upsert' | 'delete'

export interface Mutation {
  /** The mutation's own id, so a per-item push result can name it. */
  id: string
  table: TableName
  rowId: ID
  op: MutationOp
  payload?: SyncedRow
  /** The row's stamp, used to order writes rather than to order the queue. */
  updatedAt: ISODateTime
  /** Monotonic within one outbox, so a flush keeps the order of edits. */
  seq: number
  attempts: number
  /** Epoch ms before which this mutation is not retried. */
  nextAttemptAt: number
  lastError?: string
}

export interface PushResult {
  mutationId: string
  ok: boolean
  /**
   * Whether trying again could ever work. A network blip is retryable; a row
   * the server refuses on principle is not, and must leave the queue.
   */
  retryable?: boolean
  error?: string
}

export interface PullResult {
  rows: Partial<Record<TableName, SyncedRow[]>>
  tombstones: Tombstone[]
  /**
   * The highest server-side stamp this pull saw, to ask from next time. It is
   * the server's own clock, never a row's `updatedAt` — that one is written by
   * whichever device made the edit, and a device whose clock runs behind would
   * otherwise write rows no one ever pulls again. Null when nothing came back,
   * which leaves the previous cursor standing.
   */
  cursor: ISODateTime | null
}

/**
 * Everything the engine needs from a server. Injectable so the whole local
 * half can be driven by an in-memory fake.
 */
export interface SyncTransport {
  push(mutations: Mutation[]): Promise<PushResult[]>
  pull(since: ISODateTime | null): Promise<PullResult>
}

export const SYNC_STATE = {
  /** No account, or no keys configured: the app is purely local.  */
  OFF: 'off',
  IDLE: 'idle',
  SYNCING: 'syncing',
  OFFLINE: 'offline',
  ERROR: 'error',
} as const

export type SyncState = (typeof SYNC_STATE)[keyof typeof SYNC_STATE]

export interface SyncStatus {
  state: SyncState
  /** Edits waiting to reach the server. */
  queued: number
  /** Edits the server refused for good; they need a person to look. */
  deadLettered: number
  lastSyncedAt: ISODateTime | null
  lastError: string | null
}

/** A record of a mutation that actually landed, for after-the-fact forensics. */
export interface AppliedRecord {
  at: ISODateTime
  direction: 'push' | 'pull'
  table: TableName
  rowId: ID
  op: MutationOp
}
