import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '../../src/lib/supabaseClient'
import { createSupabaseTransport } from '../../src/sync/supabaseTransport'
import { SYNC_TABLES } from '../../src/sync/types'

type Result = {
  data: unknown
  error: { code?: string; message?: string } | null
}

/**
 * A stand-in for the Supabase client: `rpc` answers from a queue, and every
 * table query (`from(...)` and its chain) records the table and returns
 * whatever `tableRows` holds for it.
 */
function fakeClient(options: {
  rpc?: Result[]
  tableRows?: Record<string, unknown[]>
}) {
  const rpcResults = [...(options.rpc ?? [])]
  const rpc = vi.fn(
    async () => rpcResults.shift() ?? { data: null, error: null },
  )
  const fromCalls: string[] = []

  const from = vi.fn((table: string) => {
    fromCalls.push(table)
    const result: Result = {
      data: options.tableRows?.[table] ?? [],
      error: null,
    }
    const chain: Record<string, unknown> = {}
    for (const method of [
      'select',
      'eq',
      'order',
      'limit',
      'or',
      'gt',
      'range',
    ]) {
      chain[method] = () => chain
    }
    chain.then = (resolve: (value: Result) => unknown) => resolve(result)
    return chain
  })

  const client = { rpc, from } as unknown as SupabaseClient
  return { client, rpc, from, fromCalls }
}

const USER = 'user-1'
const SINCE = '2026-11-23T10:00:00.000Z'

function emptyTables(): Record<string, unknown[]> {
  return Object.fromEntries(SYNC_TABLES.map((table) => [table, []]))
}

describe('supabase transport pull', () => {
  it('asks for a delta in one call and maps rows, deletions and the cursor', async () => {
    const tables = emptyTables()
    tables.goals = [
      {
        id: 'g1',
        updated_at: '2026-11-23T10:00:05.000001+00:00',
        data: { title: 'a', id: 'stale' },
      },
    ]
    tables.time_entries = [
      { id: 't1', updated_at: '2026-11-23T10:00:07.000001+00:00', data: {} },
    ]
    const { client, rpc, from } = fakeClient({
      rpc: [
        {
          data: {
            tables,
            deletions: [
              {
                table_name: 'goals',
                row_id: 'g0',
                deleted_at: '2026-11-23T09:00:00+00:00',
                synced_at: '2026-11-23T10:00:09.000001+00:00',
              },
              {
                table_name: 'unknown',
                row_id: 'x',
                deleted_at: '2026-11-23T09:00:00+00:00',
                synced_at: '2026-11-23T10:00:59.000001+00:00',
              },
            ],
          },
          error: null,
        },
      ],
    })

    const transport = createSupabaseTransport({ client, userId: () => USER })
    const result = await transport.pull(SINCE)

    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('pull_changes', {
      // The 30 s overlap is applied before asking.
      since: '2026-11-23T09:59:30.000Z',
      max_rows: 1000,
    })
    expect(from).not.toHaveBeenCalled()
    expect(result.rows.goals).toEqual([{ title: 'a', id: 'g1' }])
    expect(result.rows.time_entries).toEqual([{ id: 't1' }])
    expect(result.rows.settings).toEqual([])
    expect(result.tombstones).toEqual([
      { table: 'goals', id: 'g0', deletedAt: '2026-11-23T09:00:00+00:00' },
    ])
    // A deletion for a table the app does not know moves nothing, not even the cursor.
    expect(result.cursor).toBe('2026-11-23T10:00:09.000001+00:00')
  })

  it('pulls table by table on the first sync, without a cursor', async () => {
    const { client, rpc, fromCalls } = fakeClient({})
    const transport = createSupabaseTransport({ client, userId: () => USER })

    await transport.pull(null)

    expect(rpc).not.toHaveBeenCalled()
    expect(fromCalls).toEqual([...SYNC_TABLES, 'deletions'])
  })

  it('falls back when the function is not deployed, and stops asking for it', async () => {
    const { client, rpc, fromCalls } = fakeClient({
      rpc: [{ data: null, error: { code: 'PGRST202', message: 'not found' } }],
      tableRows: {
        goals: [
          { id: 'g1', updated_at: '2026-11-23T10:00:05+00:00', data: {} },
        ],
      },
    })
    const transport = createSupabaseTransport({ client, userId: () => USER })

    const first = await transport.pull(SINCE)
    expect(first.rows.goals).toEqual([{ id: 'g1' }])
    expect(fromCalls).toEqual([...SYNC_TABLES, 'deletions'])

    await transport.pull(SINCE)
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('falls back to paging when a list comes back fuller than a page', async () => {
    const tables = emptyTables()
    tables.daily_tasks = Array.from({ length: 1001 }, (_, index) => ({
      id: `d${index}`,
      updated_at: '2026-11-23T10:00:05+00:00',
      data: {},
    }))
    const { client, rpc, fromCalls } = fakeClient({
      rpc: [
        { data: { tables, deletions: [] }, error: null },
        { data: { tables: emptyTables(), deletions: [] }, error: null },
      ],
    })
    const transport = createSupabaseTransport({ client, userId: () => USER })

    await transport.pull(SINCE)
    expect(fromCalls).toEqual([...SYNC_TABLES, 'deletions'])

    // An overflow is about that delta only: the next pull uses the function again.
    await transport.pull(SINCE)
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(fromCalls).toHaveLength(SYNC_TABLES.length + 1)
  })

  it('reports any other error instead of hiding it behind the fallback', async () => {
    const { client, from } = fakeClient({
      rpc: [
        {
          data: null,
          error: { code: '57014', message: 'canceling statement' },
        },
      ],
    })
    const transport = createSupabaseTransport({ client, userId: () => USER })

    await expect(transport.pull(SINCE)).rejects.toThrow('canceling statement')
    expect(from).not.toHaveBeenCalled()
  })
})
