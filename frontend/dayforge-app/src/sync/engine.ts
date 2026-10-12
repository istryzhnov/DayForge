import { computed, ref, watch, type ComputedRef } from 'vue'
import type { ID } from '../entities/types'
import { diffRows, snapshotRows, stableStringify, type Shadow } from './diff'
import {
  indexTombstones,
  mergeCollection,
  mergeIncoming,
  type CollectionMerge,
} from './merge'
import { partitionLive } from './tombstoneRules'
import { createOutbox, type Outbox, type OutboxPersistence } from './outbox'
import { createRingLog, type RingLog, type RingLogPersistence } from './ringLog'
import type { SnapshotStore } from './snapshots'
import {
  SYNC_STATE,
  SYNC_TABLES,
  type AppliedRecord,
  type SyncState,
  type SyncStatus,
  type SyncedRow,
  type SyncTransport,
  type TableName,
  type Tombstone,
} from './types'

/** One of the app's live arrays, described so the engine can watch and replace it. */
export interface SyncCollection {
  table: TableName
  /** Read inside the watcher, so Vue knows what to track. */
  track: () => unknown
  read: () => SyncedRow[]
  write: (rows: SyncedRow[]) => void
}

export interface SyncMeta {
  /** Server time of the last successful pull, per account. */
  cursors: Record<string, string>
  /** Accounts whose first-login merge has already happened. */
  migrated: string[]
  localDirty?: boolean
  /** The account the pending queue was built for. */
  queueOwner?: string
}

export interface MetaPersistence {
  read(): SyncMeta | null
  write(meta: SyncMeta): void
}

export interface SyncEngineDeps {
  transport: () => SyncTransport | null
  userId: () => string | null
  now: () => number
  setTimer: (fn: () => void, ms: number) => unknown
  clearTimer: (handle: unknown) => void
  isOnline: () => boolean
  isSignedOut?: () => boolean
  random?: () => number
  snapshots: SnapshotStore
  /** A whole backup, taken before a first merge touches anything. */
  buildBackup: () => unknown
  tombstones: {
    all: () => Tombstone[]
    merge: (incoming: Tombstone[]) => void
    sweep: () => void
  }
  outboxPersistence?: OutboxPersistence
  ringLogPersistence?: RingLogPersistence
  metaPersistence?: MetaPersistence
  debounceMs?: number
  baseBackoffMs?: number
  maxBackoffMs?: number
}

export interface SyncEngine {
  register(collections: SyncCollection[]): void
  /** Called when a session appears; runs the first-login merge once per account. */
  onSignedIn(): Promise<void>
  onSignedOut(): void
  pull(): Promise<void>
  flush(): Promise<void>
  sync(): Promise<void>
  status: ComputedRef<SyncStatus>
  retryDead(): void
  discardDead(): void
  readonly log: RingLog
  readonly outbox: Outbox
}

const EMPTY_META: SyncMeta = { cursors: {}, migrated: [] }

export function createSyncEngine(deps: SyncEngineDeps): SyncEngine {
  let collections: SyncCollection[] = []
  const shadows = new Map<TableName, Shadow>()
  const stopWatchers: Array<() => void> = []

  let meta: SyncMeta = deps.metaPersistence?.read() ?? { ...EMPTY_META }
  /** True while a pull writes into the arrays, so the diff stays quiet. */
  let applyingRemote = false
  let pulling = false
  let signingIn: Promise<void> | null = null
  /**
   * Nothing leaves this device until the first merge has decided what the truth
   * is. Edits still queue up in the meantime; they just wait. Pushing first
   * would make an empty account look occupied and send the migration down the
   * path meant for two devices that already disagree.
   */
  let gateOpen = false

  const queued = ref(0)
  const deadCount = ref(0)
  const busy = ref(false)
  const lastSyncedAt = ref<string | null>(null)
  const lastError = ref<string | null>(null)

  const log = createRingLog(undefined, deps.ringLogPersistence)

  function persistMeta() {
    deps.metaPersistence?.write(meta)
  }

  function refreshCounters() {
    queued.value = outbox.queued
    deadCount.value = outbox.dead.length
    lastError.value = outbox.lastError ?? lastError.value
  }

  function onApplied(records: AppliedRecord[]) {
    log.append(records)
    lastSyncedAt.value = new Date(deps.now()).toISOString()
    lastError.value = null
  }

  const outbox: Outbox = createOutbox({
    transport: () => (gateOpen ? deps.transport() : null),
    now: deps.now,
    setTimer: deps.setTimer,
    clearTimer: deps.clearTimer,
    isOnline: deps.isOnline,
    random: deps.random,
    persistence: deps.outboxPersistence,
    onChange: refreshCounters,
    onApplied,
    debounceMs: deps.debounceMs,
    baseBackoffMs: deps.baseBackoffMs,
    maxBackoffMs: deps.maxBackoffMs,
  })

  refreshCounters()

  function collectionFor(table: TableName): SyncCollection | undefined {
    return collections.find((item) => item.table === table)
  }

  /**
   * Turns whatever changed in an array into queue entries. Rebuilding today,
   * carrying tasks forward and Vue's own deep watcher all fire without changing
   * a value; the diff is what keeps those out of the queue.
   */
  function syncCollection(collection: SyncCollection) {
    if (applyingRemote) return

    const shadow = shadows.get(collection.table) ?? new Map<ID, string>()
    const rows = collection.read()
    const result = diffRows(shadow, rows)

    if (result.changes.length === 0) {
      shadows.set(collection.table, result.shadow)
      return
    }

    if (deps.userId() === null) {
      if (deps.isSignedOut?.() && !meta.localDirty) {
        meta = { ...meta, localDirty: true }
        persistMeta()
      }
      return
    }

    claimQueue(deps.userId() as string)
    restampUnstamped(shadow, result.changes, result.shadow)
    shadows.set(collection.table, result.shadow)

    result.changes.forEach((change) => {
      const updatedAt =
        change.row?.updatedAt ??
        change.row?.createdAt ??
        new Date(deps.now()).toISOString()

      outbox.enqueue(
        collection.table,
        change.rowId,
        change.op,
        change.row,
        typeof updatedAt === 'string' ? updatedAt : new Date(deps.now()).toISOString(),
      )
    })
  }

  /**
   * A queue left by another account never reaches this one. The local rows
   * still hold those edits, so a full merge on the next pull settles them.
   */
  function claimQueue(userId: string) {
    if (meta.queueOwner === userId) return
    if (meta.queueOwner !== undefined && outbox.pending.length > 0) {
      outbox.pending.forEach((mutation) => outbox.drop(mutation.table, mutation.rowId))
      meta = { ...meta, localDirty: true }
    }
    meta = { ...meta, queueOwner: userId }
    persistMeta()
  }

  function previousStamp(serialised: string | undefined): unknown {
    if (serialised === undefined) return undefined
    try {
      return (JSON.parse(serialised) as { updatedAt?: unknown }).updatedAt
    } catch {
      return undefined
    }
  }

  function restampUnstamped(
    previous: Shadow,
    changes: ReturnType<typeof diffRows>['changes'],
    next: Shadow,
  ) {
    const stamp = new Date(deps.now()).toISOString()
    changes.forEach((change) => {
      const row = change.row
      if (change.op !== 'upsert' || !row) return
      const before = previous.get(change.rowId)
      if (before === undefined) return
      if (row.updatedAt !== previousStamp(before)) return
      row.updatedAt = stamp
      next.set(change.rowId, stableStringify(row))
    })
  }

  function resyncShadow(collection: SyncCollection) {
    shadows.set(collection.table, snapshotRows(collection.read()))
  }

  function register(next: SyncCollection[]) {
    stopWatchers.forEach((stop) => stop())
    stopWatchers.length = 0
    collections = next

    collections.forEach((collection) => {
      resyncShadow(collection)
      const stop = watch(
        () => collection.track(),
        () => syncCollection(collection),
        { deep: true },
      )
      stopWatchers.push(stop)
    })
  }

  /** Rows the queue is about to delete must not be brought back by a pull. */
  function pendingDeletes(table: TableName): Set<ID> {
    const ids = new Set<ID>()
    outbox.pending.forEach((mutation) => {
      if (mutation.table === table && mutation.op === 'delete') {
        ids.add(mutation.rowId)
      }
    })
    return ids
  }

  function applyRows(collection: SyncCollection, rows: SyncedRow[]) {
    applyingRemote = true
    try {
      collection.write(rows)
    } finally {
      applyingRemote = false
    }
    resyncShadow(collection)
  }

  function enqueueRows(table: TableName, rows: SyncedRow[]) {
    rows.forEach((row) => {
      outbox.enqueue(
        table,
        row.id,
        'upsert',
        row,
        row.updatedAt ?? new Date(deps.now()).toISOString(),
      )
    })
  }

  function enqueueDeletes(table: TableName, ids: ID[]) {
    const at = new Date(deps.now()).toISOString()
    ids.forEach((id) => outbox.enqueue(table, id, 'delete', undefined, at))
  }

  /**
   * Hands a merge result to the app, with the same defensive filter the load
   * paths run. A row that arrives already marked deleted is kept out of the
   * array, its burial recorded, and the deletion sent back — otherwise the
   * server's copy would simply arrive again on the next pull.
   */
  function applyMerge(
    collection: SyncCollection,
    result: CollectionMerge,
    incoming: SyncedRow[],
  ) {
    const { table } = collection
    const { live, stones } = partitionLive(table, result.merged)

    applyRows(collection, live)
    dropSuperseded(table, live, result, incoming)

    if (stones.length > 0) {
      deps.tombstones.merge(stones)
      stones.forEach((stone) =>
        outbox.enqueue(table, stone.id, 'delete', undefined, stone.deletedAt),
      )
    }

    const buried = new Set(stones.map((stone) => stone.id))
    enqueueRows(
      table,
      result.toPush.filter((row) => !buried.has(row.id)),
    )
    enqueueDeletes(
      table,
      result.toDelete.filter((id) => !buried.has(id)),
    )
  }

  function dropSuperseded(
    table: TableName,
    live: SyncedRow[],
    result: CollectionMerge,
    incoming: SyncedRow[],
  ) {
    const liveById = new Map(live.map((row) => [row.id, row]))
    const incomingById = new Map(incoming.map((row) => [row.id, row]))
    const pushing = new Set(result.toPush.map((row) => row.id))

    outbox.pending
      .filter(
        (mutation) =>
          mutation.table === table &&
          mutation.op === 'upsert' &&
          !pushing.has(mutation.rowId),
      )
      .forEach((mutation) => {
        const held = liveById.get(mutation.rowId)
        const remote = incomingById.get(mutation.rowId)
        if (held === undefined) {
          outbox.drop(table, mutation.rowId)
          return
        }
        if (remote !== undefined && stableStringify(held) === stableStringify(remote)) {
          outbox.drop(table, mutation.rowId)
        }
      })
  }

  async function runPull(full: boolean): Promise<void> {
    const transport = deps.transport()
    const userId = deps.userId()
    if (!gateOpen || !transport || userId === null || pulling) return
    if (!deps.isOnline()) return

    pulling = true
    busy.value = true

    try {
      const since = full ? null : (meta.cursors[userId] ?? null)
      const result = await transport.pull(since)

      deps.tombstones.merge(result.tombstones)
      const tombstoneIndex = indexTombstones(deps.tombstones.all())

      SYNC_TABLES.forEach((table) => {
        const collection = collectionFor(table)
        if (!collection) return

        const queuedDeletes = pendingDeletes(table)
        const incoming = (result.rows[table] ?? []).filter(
          (row) => !queuedDeletes.has(row.id),
        )

        const local = collection.read()
        const merged = full
          ? mergeCollection(table, local, incoming, tombstoneIndex)
          : mergeIncoming(
              table,
              local,
              incoming,
              result.tombstones,
              tombstoneIndex,
            )

        applyMerge(collection, merged, incoming)
      })

      if (full && meta.localDirty) meta = { ...meta, localDirty: false }

      // Nothing new means nothing to move the cursor to; the old one stands.
      const previous = meta.cursors[userId]
      if (
        result.cursor !== null &&
        (previous === undefined || result.cursor > previous)
      ) {
        meta = {
          ...meta,
          cursors: { ...meta.cursors, [userId]: result.cursor },
        }
        persistMeta()
      }
      lastSyncedAt.value = new Date(deps.now()).toISOString()
      lastError.value = null
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error)
    } finally {
      pulling = false
      busy.value = false
      refreshCounters()
    }
  }

  function localRowCount(): number {
    return collections.reduce(
      (total, collection) => total + collection.read().length,
      0,
    )
  }

  /**
   * The first sign-in on a device, with no questions asked. An empty server is
   * simply filled from here. When both sides hold data, the same rules the
   * everyday sync uses decide it — asking would imply those rules were not
   * trusted — and a copy of the local state is tucked away first in case the
   * answer turns out wrong.
   */
  function onSignedIn(): Promise<void> {
    if (signingIn) return signingIn
    signingIn = signIn().finally(() => {
      signingIn = null
    })
    return signingIn
  }

  async function signIn(): Promise<void> {
    const transport = deps.transport()
    const userId = deps.userId()
    if (!transport || userId === null) return
    if (!deps.isOnline()) return

    deps.tombstones.sweep()
    claimQueue(userId)

    if (meta.migrated.includes(userId)) {
      collections.forEach(syncCollection)
      gateOpen = true
      await runPull(meta.localDirty === true)
      await outbox.flush()
      return
    }

    busy.value = true
    try {
      const remote = await transport.pull(null)
      const remoteCount = SYNC_TABLES.reduce(
        (total, table) => total + (remote.rows[table]?.length ?? 0),
        0,
      )
      const localCount = localRowCount()

      if (remoteCount > 0 && localCount > 0) {
        // Both sides have history. Quietly keep a copy before merging them.
        // A full storage must not hold the account's sync hostage.
        try {
          await deps.snapshots.save(
            'Before the first merge with this account',
            deps.buildBackup(),
          )
        } catch (error) {
          console.warn('Pre-merge snapshot failed', error)
        }
      }

      deps.tombstones.merge(remote.tombstones)
      const tombstoneIndex = indexTombstones(deps.tombstones.all())

      SYNC_TABLES.forEach((table) => {
        const collection = collectionFor(table)
        if (!collection) return

        const incoming = remote.rows[table] ?? []
        applyMerge(
          collection,
          mergeCollection(table, collection.read(), incoming, tombstoneIndex),
          incoming,
        )
      })

      meta = {
        ...meta,
        localDirty: false,
        cursors:
          remote.cursor === null
            ? meta.cursors
            : { ...meta.cursors, [userId]: remote.cursor },
        migrated: [...meta.migrated, userId],
      }
      persistMeta()
      lastError.value = null
      gateOpen = true
    } catch (error) {
      // A migration that could not finish leaves the gate shut: the edits stay
      // queued here rather than reaching the server half-reconciled.
      lastError.value = error instanceof Error ? error.message : String(error)
    } finally {
      busy.value = false
      refreshCounters()
    }

    await outbox.flush()
  }

  async function sync(): Promise<void> {
    if (deps.userId() === null || deps.transport() === null) return
    if (!gateOpen) {
      await onSignedIn()
      return
    }
    await runPull(meta.localDirty === true)
    await outbox.flush()
  }

  /** Signing out leaves the local data and the queue alone; the next sign-in decides. */
  function onSignedOut() {
    gateOpen = false
    outbox.cancelScheduledFlush()
    outbox.discardDead()
    refreshCounters()
  }

  const status = computed<SyncStatus>(() => {
    const configured = deps.transport() !== null && deps.userId() !== null
    let state: SyncState = SYNC_STATE.IDLE

    if (!configured) {
      state = SYNC_STATE.OFF
    } else if (deadCount.value > 0) {
      state = SYNC_STATE.ERROR
    } else if (!deps.isOnline()) {
      state = SYNC_STATE.OFFLINE
    } else if (busy.value || queued.value > 0) {
      state = SYNC_STATE.SYNCING
    }

    return {
      state,
      queued: queued.value,
      deadLettered: deadCount.value,
      lastSyncedAt: lastSyncedAt.value,
      lastError: lastError.value,
    }
  })

  return {
    register,
    onSignedIn,
    onSignedOut,
    pull: () => runPull(meta.localDirty === true),
    flush: () => outbox.flush(),
    sync,
    status,
    retryDead: () => {
      outbox.retryDead()
      refreshCounters()
    },
    discardDead: () => {
      outbox.discardDead()
      refreshCounters()
    },
    log,
    outbox,
  }
}
