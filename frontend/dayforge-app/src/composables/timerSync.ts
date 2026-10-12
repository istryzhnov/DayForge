import { readJson, writeJson } from '../lib/storage'
import { stableStringify } from '../sync/diff'
import type { SyncCollection } from '../sync/engine'
import { SYNC_TABLE, type SyncedRow } from '../sync/types'
import { TIMER_STATUS } from '../entities/constants'
import { applyRemoteTimer, readActiveTimer } from './useTimer'
import { isKnownTimerStatus } from './timer/sanitize'

const TIMER_SYNC_STORAGE_KEY = 'dayforge-timer-sync-v1'
const TIMER_ROW_ID = 'active-timer'

interface TimerStamp {
  signature: string
  updatedAt?: string
}

function payload(): Record<string, unknown> {
  const { timer, closedSessionId } = readActiveTimer()
  return JSON.parse(JSON.stringify({ ...timer, closedSessionId }))
}

function isStamp(value: unknown): value is TimerStamp {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<TimerStamp>
  return (
    typeof candidate.signature === 'string' &&
    (candidate.updatedAt === undefined || typeof candidate.updatedAt === 'string')
  )
}

/** The one running timer, as a single row every device reads and writes. */
export function createTimerCollection(): SyncCollection {
  const stored = readJson<unknown>(TIMER_SYNC_STORAGE_KEY, null)
  let stamp: TimerStamp
  if (isStamp(stored)) {
    stamp = stored
  } else {
    // An idle timer on a fresh device carries no stamp, so it never outranks a running one.
    const idle = readActiveTimer().timer.status === TIMER_STATUS.IDLE
    stamp = {
      signature: stableStringify(payload()),
      updatedAt: idle ? undefined : new Date().toISOString(),
    }
    writeJson(TIMER_SYNC_STORAGE_KEY, stamp)
  }

  function read(): SyncedRow[] {
    const current = payload()
    const signature = stableStringify(current)
    if (signature !== stamp.signature) {
      stamp = { signature, updatedAt: new Date().toISOString() }
      writeJson(TIMER_SYNC_STORAGE_KEY, stamp)
    }

    const row: SyncedRow = { id: TIMER_ROW_ID, ...current }
    if (stamp.updatedAt !== undefined) row.updatedAt = stamp.updatedAt
    return [row]
  }

  function write(rows: SyncedRow[]) {
    const row = rows.find((item) => item.id === TIMER_ROW_ID)
    if (!row) return

    const { id: _id, updatedAt, closedSessionId, ...timer } = row
    if (!isKnownTimerStatus(timer.status)) return

    const incoming = { ...timer, closedSessionId }
    if (stableStringify(incoming) !== stableStringify(payload())) {
      applyRemoteTimer(
        timer,
        typeof closedSessionId === 'string' ? closedSessionId : '',
      )
    }

    stamp = {
      signature: stableStringify(payload()),
      updatedAt: typeof updatedAt === 'string' ? updatedAt : stamp.updatedAt,
    }
    writeJson(TIMER_SYNC_STORAGE_KEY, stamp)
  }

  return {
    table: SYNC_TABLE.ACTIVE_TIMER,
    track: () => readActiveTimer(),
    read,
    write,
  }
}
