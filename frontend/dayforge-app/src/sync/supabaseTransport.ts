import type { SupabaseClient } from '../lib/supabaseClient'
import {
  OPTIONAL_SYNC_TABLES,
  SYNC_TABLES,
  type Mutation,
  type PullResult,
  type PushResult,
  type SyncedRow,
  type SyncTransport,
  type TableName,
  type Tombstone,
} from './types'

/** PostgREST's own ceiling; anything larger comes back truncated. */
const PAGE_SIZE = 1000

const DELETIONS_TABLE = 'deletions'

const CURSOR_OVERLAP_MS = 30_000

const MISSING_TABLE_CODES = new Set(['42P01', 'PGRST205'])

function withOverlap(since: string | null): string | null {
  if (since === null) return null
  const at = Date.parse(since)
  if (Number.isNaN(at)) return since
  return new Date(at - CURSOR_OVERLAP_MS).toISOString()
}

interface StoredRow {
  id: string
  /** The database's own stamp, set by a trigger. Only the cursor reads it. */
  updated_at: string
  data: SyncedRow
}

interface StoredDeletion {
  table_name: string
  row_id: string
  /** The deleting device's clock, weighed against a row's `updatedAt`. */
  deleted_at: string
  /** The database's own stamp, set by a trigger. Only the cursor reads it. */
  synced_at: string
}

/**
 * Whether trying the same write again could ever succeed. A dropped connection
 * or an overloaded server will; a row the database refuses on principle never
 * will, and has to leave the queue so the rest can move.
 */
function isRetryable(
  error: { code?: string; message?: string } | null,
): boolean {
  if (!error) return true
  if (MISSING_TABLE_CODES.has(error.code ?? '')) return true

  const status = (error as { status?: number }).status
  if (typeof status === 'number') {
    if (status === 408 || status === 429) return true
    if (status >= 400 && status < 500) return false
    return true
  }

  const code = error.code ?? ''
  // 22 data exception, 23 integrity violation, 42 syntax or access rule.
  if (/^(22|23|42)/.test(code)) return false
  if (code === 'PGRST301' || code === 'PGRST302') return false
  return true
}

function errorMessage(error: { message?: string } | null): string {
  return error?.message ?? 'unknown error'
}

export interface SupabaseTransportDeps {
  client: SupabaseClient
  /** Null before a session exists; a push without it would break RLS. */
  userId: () => string | null
}

export function createSupabaseTransport(
  deps: SupabaseTransportDeps,
): SyncTransport {
  const { client } = deps

  function requireUser(): string {
    const userId = deps.userId()
    if (!userId) throw new Error('Not signed in')
    return userId
  }

  async function upsertBatch(
    table: TableName,
    mutations: Mutation[],
    userId: string,
  ): Promise<{ error: { code?: string; message?: string } | null }> {
    // `updated_at` is deliberately not sent: a trigger sets it from the
    // database's clock, so the pull cursor can never be outrun by a device
    // whose own clock runs behind.
    const rows = mutations.map((mutation) => ({
      id: mutation.rowId,
      user_id: userId,
      data: mutation.payload ?? {},
    }))

    const { error } = await client
      .from(table)
      .upsert(rows, { onConflict: 'user_id,id' })
    return { error }
  }

  async function deleteBatch(
    table: TableName,
    mutations: Mutation[],
    userId: string,
  ): Promise<{ error: { code?: string; message?: string } | null }> {
    const ids = mutations.map((mutation) => mutation.rowId)

    const { error } = await client
      .from(table)
      .delete()
      .eq('user_id', userId)
      .in('id', ids)

    if (error) return { error }

    // The deletion itself has to be recorded, or the other device would hand
    // the row straight back: absence alone says nothing.
    const stones = mutations.map((mutation) => ({
      user_id: userId,
      table_name: table,
      row_id: mutation.rowId,
      deleted_at: mutation.updatedAt,
    }))

    const { error: stoneError } = await client
      .from(DELETIONS_TABLE)
      .upsert(stones, { onConflict: 'user_id,table_name,row_id' })

    return { error: stoneError }
  }

  function sendGroup(
    table: TableName,
    op: 'upsert' | 'delete',
    mutations: Mutation[],
    userId: string,
  ) {
    return op === 'upsert'
      ? upsertBatch(table, mutations, userId)
      : deleteBatch(table, mutations, userId)
  }

  /**
   * PostgREST answers for a whole statement, not for each row in it. When a
   * batch is refused outright, it is replayed one row at a time so the single
   * offender can be named and dead-lettered on its own.
   */
  async function attributeFailure(
    table: TableName,
    op: 'upsert' | 'delete',
    mutations: Mutation[],
    userId: string,
    groupError: { code?: string; message?: string } | null,
  ): Promise<PushResult[]> {
    if (mutations.length === 1) {
      return [
        {
          mutationId: mutations[0].id,
          ok: false,
          retryable: isRetryable(groupError),
          error: errorMessage(groupError),
        },
      ]
    }

    if (isRetryable(groupError)) {
      return mutations.map((mutation) => ({
        mutationId: mutation.id,
        ok: false,
        retryable: true,
        error: errorMessage(groupError),
      }))
    }

    const results: PushResult[] = []
    for (const mutation of mutations) {
      const { error } = await sendGroup(table, op, [mutation], userId)
      results.push(
        error
          ? {
              mutationId: mutation.id,
              ok: false,
              retryable: isRetryable(error),
              error: errorMessage(error),
            }
          : { mutationId: mutation.id, ok: true },
      )
    }
    return results
  }

  async function push(mutations: Mutation[]): Promise<PushResult[]> {
    if (mutations.length === 0) return []
    const userId = requireUser()

    const groups = new Map<string, Mutation[]>()
    mutations.forEach((mutation) => {
      const key = `${mutation.table}\u0000${mutation.op}`
      const group = groups.get(key) ?? []
      group.push(mutation)
      groups.set(key, group)
    })

    const results: PushResult[] = []

    for (const [key, group] of groups) {
      const [table, op] = key.split('\u0000') as [
        TableName,
        'upsert' | 'delete',
      ]
      const { error } = await sendGroup(table, op, group, userId)

      if (!error) {
        group.forEach((mutation) =>
          results.push({ mutationId: mutation.id, ok: true }),
        )
        continue
      }

      results.push(...(await attributeFailure(table, op, group, userId, error)))
    }

    return results
  }

  function quoteFilter(value: string): string {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  }

  async function pullTable(
    table: TableName,
    userId: string,
    since: string | null,
  ): Promise<{ rows: SyncedRow[]; cursor: string | null }> {
    const collected: SyncedRow[] = []
    let cursor: string | null = null

    let last: StoredRow | null = null

    for (;;) {
      let query = client
        .from(table)
        .select('id, updated_at, data')
        .eq('user_id', userId)
        .order('updated_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(PAGE_SIZE)

      // Keyset paging: offsets shift when a row changes mid-pull and skip rows.
      if (last !== null) {
        const at = quoteFilter(last.updated_at)
        query = query.or(
          `updated_at.gt.${at},and(updated_at.eq.${at},id.gt.${quoteFilter(last.id)})`,
        )
      } else if (since !== null) {
        query = query.gt('updated_at', since)
      }

      const { data, error } = await query
      if (error) {
        if (
          OPTIONAL_SYNC_TABLES.includes(table) &&
          MISSING_TABLE_CODES.has(error.code ?? '')
        ) {
          return { rows: [], cursor: null }
        }
        throw new Error(errorMessage(error))
      }

      const rows = (data ?? []) as StoredRow[]
      rows.forEach((row) => {
        // The row the app reads is the payload; the columns are just an index.
        collected.push({ ...row.data, id: row.id })
        if (cursor === null || row.updated_at > cursor) cursor = row.updated_at
      })

      if (rows.length < PAGE_SIZE) break
      last = rows[rows.length - 1]
    }

    return { rows: collected, cursor }
  }

  async function pullDeletions(
    userId: string,
    since: string | null,
  ): Promise<{ tombstones: Tombstone[]; cursor: string | null }> {
    const fetched: StoredDeletion[] = []

    for (let page = 0; ; page += 1) {
      let query = client
        .from(DELETIONS_TABLE)
        .select('table_name, row_id, deleted_at, synced_at')
        .eq('user_id', userId)
        .order('synced_at', { ascending: true })
        .order('table_name', { ascending: true })
        .order('row_id', { ascending: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (since !== null) query = query.gt('synced_at', since)

      const { data, error } = await query
      if (error) throw new Error(errorMessage(error))

      const rows = (data ?? []) as StoredDeletion[]
      fetched.push(...rows)
      if (rows.length < PAGE_SIZE) break
    }

    const stored = fetched.filter((row) =>
      (SYNC_TABLES as string[]).includes(row.table_name),
    )

    let cursor: string | null = null
    stored.forEach((row) => {
      if (cursor === null || row.synced_at > cursor) cursor = row.synced_at
    })

    return {
      tombstones: stored.map((row) => ({
        table: row.table_name as TableName,
        id: row.row_id,
        deletedAt: row.deleted_at,
      })),
      cursor,
    }
  }

  async function pull(since: string | null): Promise<PullResult> {
    const userId = requireUser()
    const from = withOverlap(since)
    const rows: Partial<Record<TableName, SyncedRow[]>> = {}
    let cursor: string | null = null

    function advance(stamp: string | null) {
      if (stamp === null) return
      if (cursor === null || stamp > cursor) cursor = stamp
    }

    for (const table of SYNC_TABLES) {
      const result = await pullTable(table, userId, from)
      rows[table] = result.rows
      advance(result.cursor)
    }

    const deletions = await pullDeletions(userId, from)
    advance(deletions.cursor)

    return { rows, tombstones: deletions.tombstones, cursor }
  }

  return { push, pull }
}
