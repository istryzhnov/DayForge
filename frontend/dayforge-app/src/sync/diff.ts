import type { ID } from '../entities/types'
import type { MutationOp, SyncedRow } from './types'

/**
 * Key order must not count as a change: a row that came back from a merge was
 * rebuilt by spreading, and a locally created one came from a literal, so the
 * same row can serialise two ways.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`
  }

  const record = value as Record<string, unknown>
  const keys = Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()

  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`
}

/** The last state the outbox was told about, per row. */
export type Shadow = Map<ID, string>

export interface RowChange {
  rowId: ID
  op: MutationOp
  row?: SyncedRow
}

export function snapshotRows(rows: SyncedRow[]): Shadow {
  const shadow: Shadow = new Map()
  rows.forEach((row) => shadow.set(row.id, stableStringify(row)))
  return shadow
}

/**
 * What actually changed between the shadow and the live array. Rebuilding
 * today's rows, carrying tasks forward and Vue's deep watcher all fire without
 * changing a single value; none of them may reach the queue.
 */
export function diffRows(
  shadow: Shadow,
  rows: SyncedRow[],
): { changes: RowChange[]; shadow: Shadow } {
  const next: Shadow = new Map()
  const changes: RowChange[] = []
  const seen = new Set<ID>()

  rows.forEach((row) => {
    const serialised = stableStringify(row)
    next.set(row.id, serialised)
    seen.add(row.id)

    if (shadow.get(row.id) === serialised) return
    changes.push({ rowId: row.id, op: 'upsert', row })
  })

  shadow.forEach((_, rowId) => {
    if (seen.has(rowId)) return
    // Gone from the array: either deleted outright, or dropped because it is
    // about to be rebuilt. Either way the server should not keep it.
    changes.push({ rowId, op: 'delete' })
  })

  return { changes, shadow: next }
}
