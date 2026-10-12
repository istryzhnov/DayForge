import { ref, watch } from 'vue'
import type { ID } from '../entities/types'
import { readJson, writeJson } from '../lib/storage'
import {
  addTombstones,
  makeTombstones,
  partitionLive,
  removeTombstone,
  restampForRestore,
  sweepTombstones,
} from '../sync/tombstoneRules'
import type { SyncedRow, TableName, Tombstone } from '../sync/types'

export const TOMBSTONES_STORAGE_KEY = 'dayforge-tombstones-v1'

const tombstones = ref<Tombstone[]>([])
let initialized = false

function isTombstone(value: unknown): value is Tombstone {
  if (typeof value !== 'object' || value === null) return false
  const stone = value as Partial<Tombstone>
  return (
    typeof stone.table === 'string' &&
    typeof stone.id === 'string' &&
    typeof stone.deletedAt === 'string' &&
    !Number.isNaN(Date.parse(stone.deletedAt))
  )
}

function initialize() {
  if (initialized) return
  initialized = true

  const stored = readJson<unknown>(TOMBSTONES_STORAGE_KEY, [])
  const list = Array.isArray(stored) ? stored.filter(isTombstone) : []
  // Anything older than the window is dropped on the way in, so the list
  // cannot grow without bound.
  tombstones.value = sweepTombstones(list, Date.now())

  watch(
    tombstones,
    (value) => writeJson(TOMBSTONES_STORAGE_KEY, value),
    { deep: true },
  )
}

/**
 * Deletions, kept apart from the live rows on purpose: the arrays the interface
 * reads hold only what still exists, so no list, counter or chart can
 * accidentally count a deleted row. What was deleted lives here, with enough of
 * the row to put it back.
 */
export function useTombstones() {
  initialize()

  function bury(table: TableName, rows: SyncedRow[]) {
    if (rows.length === 0) return
    const deletedAt = new Date().toISOString()
    tombstones.value = addTombstones(
      tombstones.value,
      makeTombstones(table, rows, deletedAt),
    )
  }

  /** Undo: the burial is lifted and the row handed back, stamped as current. */
  function exhume(table: TableName, id: ID): SyncedRow | undefined {
    const result = removeTombstone(tombstones.value, table, id)
    tombstones.value = result.list
    if (!result.payload) return undefined
    return restampForRestore(result.payload)
  }

  function exhumeAll(table: TableName, ids: ID[]): SyncedRow[] {
    return ids
      .map((id) => exhume(table, id))
      .filter((row): row is SyncedRow => row !== undefined)
  }

  /**
   * The defensive filter every load path runs. A row that arrives already
   * marked deleted is kept out of the live list *and* its burial recorded, so
   * the next sync carries the deletion rather than letting the server's copy
   * come back the next time the app opens.
   */
  function keepLive<T extends { id: ID; deletedAt?: string }>(
    table: TableName,
    rows: T[],
  ): T[] {
    const { live, stones } = partitionLive(table, rows)
    if (stones.length > 0) merge(stones)
    return live
  }

  function merge(incoming: Tombstone[]) {
    if (incoming.length === 0) return
    tombstones.value = addTombstones(tombstones.value, incoming)
  }

  function sweep() {
    const swept = sweepTombstones(tombstones.value, Date.now())
    if (swept.length !== tombstones.value.length) tombstones.value = swept
  }

  return {
    tombstones,
    bury,
    exhume,
    exhumeAll,
    keepLive,
    merge,
    sweep,
  }
}
