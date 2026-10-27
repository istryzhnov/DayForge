import type { ID, ISODateTime } from '../entities/types'
import type {
  AppliedRecord,
  Mutation,
  MutationOp,
  SyncedRow,
  SyncTransport,
  TableName,
} from './types'

export interface OutboxState {
  pending: Mutation[]
  dead: Mutation[]
  seq: number
}

export interface OutboxPersistence {
  read(): OutboxState | null
  write(state: OutboxState): void
}

export interface OutboxDeps {
  /** Null while there is no account or no keys: edits still queue up. */
  transport: () => SyncTransport | null
  now: () => number
  setTimer: (fn: () => void, ms: number) => unknown
  clearTimer: (handle: unknown) => void
  isOnline: () => boolean
  random?: () => number
  persistence?: OutboxPersistence
  onChange?: () => void
  onApplied?: (records: AppliedRecord[]) => void
  /** A whole-batch failure, reported without its payload. */
  onError?: (error: unknown) => void
  debounceMs?: number
  baseBackoffMs?: number
  maxBackoffMs?: number
}

const DEFAULT_DEBOUNCE_MS = 500
const DEFAULT_BASE_BACKOFF_MS = 1000
const DEFAULT_MAX_BACKOFF_MS = 5 * 60 * 1000

export interface Outbox {
  enqueue(
    table: TableName,
    rowId: ID,
    op: MutationOp,
    payload: SyncedRow | undefined,
    updatedAt: ISODateTime,
  ): void
  flush(): Promise<void>
  /** Puts dead-lettered mutations back in the queue for one more go. */
  retryDead(): void
  discardDead(): void
  drop(table: TableName, rowId: ID): void
  readonly pending: readonly Mutation[]
  readonly dead: readonly Mutation[]
  /** Everything not yet acknowledged by the server. */
  readonly queued: number
  readonly lastError: string | null
  cancelScheduledFlush(): void
}

export function createOutbox(deps: OutboxDeps): Outbox {
  const debounceMs = deps.debounceMs ?? DEFAULT_DEBOUNCE_MS
  const baseBackoff = deps.baseBackoffMs ?? DEFAULT_BASE_BACKOFF_MS
  const maxBackoff = deps.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS
  const random = deps.random ?? Math.random

  const restored = deps.persistence?.read() ?? null
  let pending: Mutation[] = restored?.pending ?? []
  let dead: Mutation[] = restored?.dead ?? []
  let seq = restored?.seq ?? 0

  let inFlight: Mutation[] = []
  let flushing = false
  let timerHandle: unknown = null
  let lastError: string | null = null

  function persist() {
    deps.persistence?.write({ pending, dead, seq })
  }

  function changed() {
    persist()
    deps.onChange?.()
  }

  function cancelScheduledFlush() {
    if (timerHandle === null) return
    deps.clearTimer(timerHandle)
    timerHandle = null
  }

  function scheduleFlush(delayMs: number) {
    cancelScheduledFlush()
    timerHandle = deps.setTimer(
      () => {
        timerHandle = null
        void flush()
      },
      Math.max(0, delayMs),
    )
  }

  /**
   * Several edits to one row collapse into one write. A delete swallows the
   * upserts before it, and an upsert after a delete (an undo) swallows that.
   */
  function enqueue(
    table: TableName,
    rowId: ID,
    op: MutationOp,
    payload: SyncedRow | undefined,
    updatedAt: ISODateTime,
  ) {
    const existing = pending.find(
      (item) => item.table === table && item.rowId === rowId,
    )

    if (existing) {
      existing.op = op
      existing.payload = payload
      existing.updatedAt = updatedAt
      // A coalesced edit is a fresh attempt, not a continuation of a failure.
      existing.attempts = 0
      existing.nextAttemptAt = 0
      delete existing.lastError
    } else {
      seq += 1
      pending.push({
        id: `m${seq}`,
        table,
        rowId,
        op,
        payload,
        updatedAt,
        seq,
        attempts: 0,
        nextAttemptAt: 0,
      })
    }

    changed()
    scheduleFlush(debounceMs)
  }

  function backoffFor(attempts: number): number {
    const raw = baseBackoff * Math.pow(2, Math.max(0, attempts - 1))
    const capped = Math.min(maxBackoff, raw)
    // Jitter keeps several devices from retrying in lockstep.
    return Math.round(capped * (0.5 + random() * 0.5))
  }

  function returnToPending(mutation: Mutation) {
    // A newer edit to the same row arrived while this one was in the air; that
    // newer one already carries the whole truth, so this one is dropped.
    const superseded = pending.some(
      (item) => item.table === mutation.table && item.rowId === mutation.rowId,
    )
    if (superseded) return
    pending.push(mutation)
  }

  async function flush(): Promise<void> {
    if (flushing) return
    cancelScheduledFlush()

    const transport = deps.transport()
    if (!transport) return

    if (!deps.isOnline()) {
      // Nothing to do but wait for the browser to say otherwise.
      return
    }

    const now = deps.now()
    const due = pending
      .filter((item) => item.nextAttemptAt <= now)
      .sort((a, b) => a.seq - b.seq)

    if (due.length === 0) {
      scheduleNextRetry()
      return
    }

    flushing = true
    const dueIds = new Set(due.map((item) => item.id))
    pending = pending.filter((item) => !dueIds.has(item.id))
    inFlight = due
    deps.onChange?.()

    try {
      const results = await transport.push(due)
      const byId = new Map(results.map((result) => [result.mutationId, result]))
      const applied: AppliedRecord[] = []
      const at = new Date(deps.now()).toISOString()

      due.forEach((mutation) => {
        const result = byId.get(mutation.id)

        if (result === undefined || result.ok) {
          applied.push({
            at,
            direction: 'push',
            table: mutation.table,
            rowId: mutation.rowId,
            op: mutation.op,
          })
          return
        }

        if (result.retryable === false) {
          // Permanently refused. It leaves the queue so the rest can move.
          dead.push({ ...mutation, lastError: result.error ?? 'rejected' })
          lastError = result.error ?? 'rejected'
          return
        }

        const attempts = mutation.attempts + 1
        returnToPending({
          ...mutation,
          attempts,
          nextAttemptAt: deps.now() + backoffFor(attempts),
          lastError: result.error ?? 'failed',
        })
        lastError = result.error ?? 'failed'
      })

      if (applied.length > 0) {
        lastError = null
        deps.onApplied?.(applied)
      }
    } catch (error) {
      // A whole-batch failure is a transport problem, so everything retries.
      deps.onError?.(error)
      const message = error instanceof Error ? error.message : String(error)
      lastError = message
      due.forEach((mutation) => {
        const attempts = mutation.attempts + 1
        returnToPending({
          ...mutation,
          attempts,
          nextAttemptAt: deps.now() + backoffFor(attempts),
          lastError: message,
        })
      })
    } finally {
      inFlight = []
      flushing = false
      changed()
      scheduleNextRetry()
    }
  }

  function scheduleNextRetry() {
    if (pending.length === 0) return
    const now = deps.now()
    const soonest = pending.reduce(
      (earliest, item) => Math.min(earliest, item.nextAttemptAt),
      Number.POSITIVE_INFINITY,
    )
    scheduleFlush(Math.max(0, soonest - now))
  }

  function retryDead() {
    if (dead.length === 0) return
    dead.forEach((mutation) => {
      returnToPending({ ...mutation, attempts: 0, nextAttemptAt: 0 })
    })
    dead = []
    lastError = null
    changed()
    scheduleFlush(0)
  }

  function discardDead() {
    if (dead.length === 0) return
    dead = []
    lastError = null
    changed()
  }

  function drop(table: TableName, rowId: ID) {
    const next = pending.filter(
      (item) => !(item.table === table && item.rowId === rowId),
    )
    if (next.length === pending.length) return
    pending = next
    changed()
  }

  return {
    enqueue,
    drop,
    flush,
    retryDead,
    discardDead,
    cancelScheduledFlush,
    get pending() {
      return pending
    },
    get dead() {
      return dead
    },
    get queued() {
      return pending.length + inFlight.length
    },
    get lastError() {
      return lastError
    },
  }
}
