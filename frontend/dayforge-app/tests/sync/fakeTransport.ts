import type { ID } from '../../src/entities/types'
import type { SnapshotBackend, SnapshotRecord } from '../../src/sync/snapshots'
import {
  SYNC_TABLES,
  type Mutation,
  type PullResult,
  type PushResult,
  type SyncedRow,
  type SyncTransport,
  type TableName,
  type Tombstone,
} from '../../src/sync/types'

/** What the server keeps: the row, plus its own stamp for the pull cursor. */
interface StoredRow {
  row: SyncedRow
  serverStamp: string
}

/**
 * A server that lives in a variable. Two transports pointed at one of these
 * behave like two devices behind one account, which is what the sync rules
 * actually have to survive.
 */
export interface FakeServer {
  rows: Map<TableName, Map<ID, StoredRow>>
  tombstones: Array<Tombstone & { serverStamp: string }>
  pushes: number
  /** Stands in for the database's own clock, which is the only one trusted. */
  tick: number
}

export function createFakeServer(): FakeServer {
  const rows = new Map<TableName, Map<ID, StoredRow>>()
  SYNC_TABLES.forEach((table) => rows.set(table, new Map()))
  return { rows, tombstones: [], pushes: 0, tick: 0 }
}

function nextStamp(server: FakeServer): string {
  server.tick += 1
  // Lexicographically ordered, like a timestamptz rendered as ISO text.
  return `2030-01-01T00:00:${String(server.tick).padStart(6, '0')}Z`
}

/** Reads a row back out, the way a client sees it. */
export function serverRow(
  server: FakeServer,
  table: TableName,
  id: ID,
): SyncedRow | undefined {
  return server.rows.get(table)?.get(id)?.row
}

export function serverCount(server: FakeServer, table: TableName): number {
  return server.rows.get(table)?.size ?? 0
}

export function serverHas(
  server: FakeServer,
  table: TableName,
  id: ID,
): boolean {
  return server.rows.get(table)?.has(id) ?? false
}

export interface FakeTransportOptions {
  /** Return a verdict to refuse one mutation; null or undefined accepts it. */
  reject?: (mutation: Mutation) => { retryable: boolean; error: string } | null
  /** Throw for the whole call, as a dropped connection would. */
  failCall?: () => string | null
}

export function createFakeTransport(
  server: FakeServer,
  options: FakeTransportOptions = {},
): SyncTransport {
  return {
    async push(mutations: Mutation[]): Promise<PushResult[]> {
      const failure = options.failCall?.() ?? null
      if (failure !== null) throw new Error(failure)

      server.pushes += 1
      const results: PushResult[] = []

      mutations.forEach((mutation) => {
        const verdict = options.reject?.(mutation) ?? null
        if (verdict) {
          results.push({
            mutationId: mutation.id,
            ok: false,
            retryable: verdict.retryable,
            error: verdict.error,
          })
          return
        }

        const table = server.rows.get(mutation.table)
        if (!table) {
          results.push({
            mutationId: mutation.id,
            ok: false,
            retryable: false,
            error: `unknown table ${mutation.table}`,
          })
          return
        }

        if (mutation.op === 'delete') {
          table.delete(mutation.rowId)
          server.tombstones = [
            ...server.tombstones.filter(
              (stone) =>
                !(
                  stone.table === mutation.table && stone.id === mutation.rowId
                ),
            ),
            {
              table: mutation.table,
              id: mutation.rowId,
              // The client's own time: the merge weighs it against a row's
              // `updatedAt`, which is also a client's time.
              deletedAt: mutation.updatedAt,
              serverStamp: nextStamp(server),
            },
          ]
        } else if (mutation.payload) {
          const held = table.get(mutation.rowId)?.row
          const incomingStamp = mutation.payload.updatedAt ?? ''
          const buriedLater = server.tombstones.some(
            (stone) =>
              stone.table === mutation.table &&
              stone.id === mutation.rowId &&
              stone.deletedAt > incomingStamp,
          )
          if (
            (held !== undefined && (held.updatedAt ?? '') > incomingStamp) ||
            (held === undefined && buriedLater)
          ) {
            results.push({ mutationId: mutation.id, ok: true })
            return
          }
          table.set(mutation.rowId, {
            row: { ...mutation.payload },
            serverStamp: nextStamp(server),
          })
          server.tombstones = server.tombstones.filter(
            (stone) =>
              !(
                stone.table === mutation.table &&
                stone.id === mutation.rowId &&
                stone.deletedAt <= mutation.updatedAt
              ),
          )
        }

        results.push({ mutationId: mutation.id, ok: true })
      })

      return results
    },

    async pull(since: string | null): Promise<PullResult> {
      const failure = options.failCall?.() ?? null
      if (failure !== null) throw new Error(failure)
      const rows: Partial<Record<TableName, SyncedRow[]>> = {}
      let cursor: string | null = null

      function advance(stamp: string) {
        if (cursor === null || stamp > cursor) cursor = stamp
      }

      SYNC_TABLES.forEach((table) => {
        const stored = [...(server.rows.get(table)?.values() ?? [])]
        const visible = stored.filter(
          (item) => since === null || item.serverStamp > since,
        )
        visible.forEach((item) => advance(item.serverStamp))
        rows[table] = visible.map((item) => ({ ...item.row }))
      })

      const tombstones = server.tombstones.filter(
        (stone) => since === null || stone.serverStamp > since,
      )
      tombstones.forEach((stone) => advance(stone.serverStamp))

      return {
        rows,
        tombstones: tombstones.map((stone) => ({
          table: stone.table,
          id: stone.id,
          deletedAt: stone.deletedAt,
        })),
        cursor,
      }
    },
  }
}

export function createMemorySnapshotBackend(): SnapshotBackend {
  let records: SnapshotRecord[] = []

  return {
    async put(record) {
      records = [record, ...records.filter((item) => item.id !== record.id)]
    },
    async list() {
      return [...records].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    },
    async remove(id) {
      records = records.filter((record) => record.id !== id)
    },
  }
}
