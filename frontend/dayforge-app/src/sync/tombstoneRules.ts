import type { ID, ISODateTime } from '../entities/types'
import type { SyncedRow, TableName, Tombstone } from './types'
import { DAILY_FIELD_GROUPS } from './merge'

/**
 * How long a deletion is remembered. It has to outlive any plausible stretch
 * of a device being offline, or that device would hand the row back.
 */
export const TOMBSTONE_MAX_AGE_DAYS = 30

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function sweepTombstones(
  list: Tombstone[],
  nowMs: number,
  maxAgeDays: number = TOMBSTONE_MAX_AGE_DAYS,
): Tombstone[] {
  const cutoff = nowMs - maxAgeDays * MS_PER_DAY
  return list.filter((stone) => {
    const at = Date.parse(stone.deletedAt)
    if (Number.isNaN(at)) return false
    return at >= cutoff
  })
}

/** Newest burial per row wins, and a re-burial replaces the earlier one. */
export function addTombstones(
  list: Tombstone[],
  additions: Tombstone[],
): Tombstone[] {
  if (additions.length === 0) return list

  const byKey = new Map<string, Tombstone>()
  const keyOf = (stone: Tombstone) => `${stone.table}\u0000${stone.id}`

  list.forEach((stone) => byKey.set(keyOf(stone), stone))
  additions.forEach((stone) => {
    const existing = byKey.get(keyOf(stone))
    if (existing === undefined || stone.deletedAt >= existing.deletedAt) {
      byKey.set(keyOf(stone), stone)
    }
  })

  return [...byKey.values()]
}

export function removeTombstone(
  list: Tombstone[],
  table: TableName,
  id: ID,
): { list: Tombstone[]; payload?: SyncedRow } {
  const found = list.find((stone) => stone.table === table && stone.id === id)
  if (!found) return { list }

  return {
    list: list.filter((stone) => !(stone.table === table && stone.id === id)),
    payload: found.payload,
  }
}

/**
 * A row coming back from an undo needs a stamp newer than its own burial, or
 * the next merge would read the deletion as the later word and bury it again.
 * Per-field stamps fall back to that fresh one, except group stamps this build
 * does not know: those mean a newer build wrote the row, so every group is
 * stamped with the same moment and the restore wins each of them.
 */
export function restampForRestore(row: SyncedRow): SyncedRow {
  const now = new Date().toISOString()
  const restored: SyncedRow = { ...row, updatedAt: now }
  delete restored.deletedAt

  const known = Object.values(DAILY_FIELD_GROUPS) as string[]
  const stamps = row.fieldsAt
  const unknown =
    typeof stamps === 'object' && stamps !== null
      ? Object.keys(stamps).filter((group) => !known.includes(group))
      : []

  if (unknown.length === 0) {
    delete restored.fieldsAt
    return restored
  }

  const fresh: Record<string, string> = {}
  known.forEach((group) => {
    fresh[group] = now
  })
  unknown.forEach((group) => {
    fresh[group] = now
  })
  restored.fieldsAt = fresh
  return restored
}

export function makeTombstones(
  table: TableName,
  rows: SyncedRow[],
  deletedAt: string,
): Tombstone[] {
  return rows.map((row) => ({
    table,
    id: row.id,
    deletedAt,
    payload: { ...row, deletedAt },
  }))
}

export interface LivePartition<T> {
  live: T[]
  /** The burials the discarded rows were carrying, ready to be recorded. */
  stones: Tombstone[]
}

/**
 * Splits rows that already carry a `deletedAt` out of a list meant to be live.
 *
 * Nothing should ever put one there: a deletion takes the row out of the array
 * and records a burial beside it. But a backup file, a store written by an
 * older build, or another device still on one, can hand one over — and merely
 * hiding it would not be enough. The row would stay on the server, arrive again
 * on the next pull, be hidden again, and go round for ever. Handing the burials
 * back is what lets the caller record them and push the deletion, so the
 * invariant repairs itself instead of being papered over.
 */
export function partitionLive<T extends { id: ID; deletedAt?: ISODateTime }>(
  table: TableName,
  rows: T[],
): LivePartition<T> {
  const live: T[] = []
  const stones: Tombstone[] = []

  rows.forEach((row) => {
    if (row.deletedAt === undefined) {
      live.push(row)
      return
    }

    stones.push({
      table,
      id: row.id,
      // The row's own stamp, not this moment: a burial dated now would claim to
      // be the latest word on a row another device may since have revived.
      deletedAt: row.deletedAt,
      payload: row as unknown as SyncedRow,
    })
  })

  return { live, stones }
}
