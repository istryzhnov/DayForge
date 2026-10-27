import type { ISODateTime } from '../entities/types'

export interface SnapshotRecord {
  id: string
  createdAt: ISODateTime
  reason: string
  /** A whole backup file, as `useDataTransfer` builds it. */
  payload: unknown
}

export interface SnapshotBackend {
  put(record: SnapshotRecord): Promise<void>
  /** Newest first. */
  list(): Promise<SnapshotRecord[]>
  remove(id: string): Promise<void>
  clear(): Promise<void>
}

/** Enough to step back past a bad merge without hoarding copies. */
export const SNAPSHOT_KEEP = 3

export interface SnapshotStore {
  save(reason: string, payload: unknown): Promise<SnapshotRecord | null>
  list(): Promise<SnapshotRecord[]>
  /** Removes every snapshot. Used when the account is deleted. */
  clear(): Promise<void>
}

export function createSnapshotStore(backend: SnapshotBackend): SnapshotStore {
  async function save(reason: string, payload: unknown) {
    const createdAt = new Date().toISOString()
    const record: SnapshotRecord = {
      id: `snapshot-${createdAt}`,
      createdAt,
      reason,
      payload,
    }

    try {
      await backend.put(record)
      const all = await backend.list()
      await Promise.all(
        all.slice(SNAPSHOT_KEEP).map((old) => backend.remove(old.id)),
      )
      return record
    } catch {
      // A snapshot is a safety net, not a gate: failing to take one must never
      // stop the sync that follows.
      return null
    }
  }

  async function list() {
    try {
      return await backend.list()
    } catch {
      return []
    }
  }

  async function clear() {
    try {
      await backend.clear()
    } catch {
      // Nothing that failed to clear is worse than the caller carrying on.
    }
  }

  return { save, list, clear }
}

const DB_NAME = 'dayforge-sync'
const DB_VERSION = 1
const STORE = 'snapshots'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('open failed'))
  })
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode)
        const request = work(transaction.objectStore(STORE))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () =>
          reject(request.error ?? new Error('request failed'))
        transaction.oncomplete = () => db.close()
      }),
  )
}

/**
 * Snapshots live in IndexedDB rather than localStorage: a whole backup can run
 * to hundreds of kilobytes and would otherwise eat the same small quota the
 * live data depends on.
 */
export const indexedDbSnapshotBackend: SnapshotBackend = {
  async put(record) {
    await runTransaction('readwrite', (store) => store.put(record))
  },
  async list() {
    const all = await runTransaction<SnapshotRecord[]>(
      'readonly',
      (store) => store.getAll() as IDBRequest<SnapshotRecord[]>,
    )
    return [...all].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  },
  async remove(id) {
    await runTransaction('readwrite', (store) => store.delete(id))
  },
  async clear() {
    await runTransaction('readwrite', (store) => store.clear())
  },
}
