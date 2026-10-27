/** Shared harness for the compat checks: the tally, check and section, and fixtures several topics use. */

import { stableStringify } from '../../../src/sync/diff'
import { type SyncedRow } from '../../../src/sync/types'

/** Shared tally of every compat check that runs in this process. */
export const tally = { checks: 0, failures: 0 }

export function check(label: string, condition: boolean, detail?: unknown) {
  tally.checks += 1
  if (condition) {
    console.log(`  ok   ${label}`)
    return
  }
  tally.failures += 1
  console.log(`  FAIL ${label}`)
  if (detail !== undefined) console.log(`       ${stableStringify(detail)}`)
}

export function section(title: string) {
  console.log(`\n${title}`)
}

export function same(left: unknown, right: unknown): boolean {
  return stableStringify(left) === stableStringify(right)
}

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export const T0 = '2026-09-01T10:00:00.000Z'

export const T1 = '2026-09-02T10:00:00.000Z'

export const T2 = '2026-09-03T10:00:00.000Z'

export const FUTURE = { futureField: { mode: 'new', level: 2 } }

export function dailyRow(overrides: Record<string, unknown> = {}): SyncedRow {
  return {
    id: 'task-a::2026-09-02',
    date: '2026-09-02',
    templateId: 'task-a',
    title: 'Write report',
    priority: 'minor',
    tagIds: [],
    status: 'todo',
    createdAt: T0,
    updatedAt: T1,
    ...FUTURE,
    ...overrides,
  } as SyncedRow
}

export function goalRow(overrides: Record<string, unknown> = {}): SyncedRow {
  return {
    id: 'goal-a',
    title: 'Work',
    status: 'active',
    createdAt: T0,
    updatedAt: T1,
    ...FUTURE,
    ...overrides,
  } as SyncedRow
}
