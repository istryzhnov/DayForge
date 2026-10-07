import type { AppliedRecord } from './types'

export interface RingLogPersistence {
  read(): AppliedRecord[] | null
  write(records: AppliedRecord[]): void
}

export interface RingLog {
  append(records: AppliedRecord[]): void
  readonly entries: readonly AppliedRecord[]
  clear(): void
}

export const RING_LOG_CAPACITY = 500

/**
 * The last few hundred writes that actually landed. With sync always on, the
 * state that caused a problem has usually been overwritten by the time anyone
 * looks — this is the only trail left to read.
 */
export function createRingLog(
  capacity: number = RING_LOG_CAPACITY,
  persistence?: RingLogPersistence,
): RingLog {
  let records: AppliedRecord[] = persistence?.read() ?? []
  if (records.length > capacity) records = records.slice(-capacity)

  function append(additions: AppliedRecord[]) {
    if (additions.length === 0) return
    records = [...records, ...additions].slice(-capacity)
    persistence?.write(records)
  }

  function clear() {
    records = []
    persistence?.write(records)
  }

  return {
    append,
    clear,
    get entries() {
      return records
    },
  }
}
