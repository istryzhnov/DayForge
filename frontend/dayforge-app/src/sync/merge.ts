import type { ID, ISODateTime } from '../entities/types'
import { stableStringify } from './diff'
import {
  EPOCH,
  fieldStampsOf,
  groupIndexOf,
  ROW_FIELD_GROUPS,
  stampOf,
  stampOfGroup,
  type FieldGroups,
} from './fieldGroups'
import {
  SYNC_TABLE,
  type SyncedRow,
  type TableName,
  type Tombstone,
} from './types'

/**
 * Groups of fields on a day row that are edited independently: ticking a task
 * off on the phone and moving it in the calendar on the laptop are two edits,
 * not one, and a single row stamp cannot tell them apart.
 */
export const DAILY_FIELD_GROUPS = {
  STATUS: 'status',
  TIME: 'time',
  DATE: 'date',
} as const

export type DailyFieldGroup =
  (typeof DAILY_FIELD_GROUPS)[keyof typeof DAILY_FIELD_GROUPS]

const DAILY_GROUP_FIELDS: Record<DailyFieldGroup, string[]> = {
  status: ['status', 'completedAt'],
  time: ['startTime', 'endTime'],
  date: ['date'],
}

function groupStamps(row: SyncedRow): Partial<Record<DailyFieldGroup, string>> {
  const raw = row.fieldsAt
  if (typeof raw !== 'object' || raw === null) return {}
  return raw as Partial<Record<DailyFieldGroup, string>>
}

/**
 * How recently this row's idea of one group was formed. A row that records any
 * group stamps but not this one is saying it never touched this group, so it
 * has no claim on it — otherwise its row stamp, set by an edit to some other
 * field entirely, would silently overwrite the other device's real edit. A row
 * from before group stamps existed has only its row stamp to go on.
 */
function groupStampOf(row: SyncedRow, group: DailyFieldGroup): ISODateTime {
  const stamps = groupStamps(row)
  const explicit = stamps[group]
  if (explicit !== undefined) return explicit
  if (Object.keys(stamps).length > 0) return EPOCH
  return stampOf(row)
}

export type MergeOutcome = 'local' | 'remote' | 'equal' | 'merged'

export interface RowMerge {
  row: SyncedRow
  outcome: MergeOutcome
}

/** Whole-row last-write-wins, used by every table but the day rows. */
function mergeByRow(local: SyncedRow, remote: SyncedRow): RowMerge {
  const localStamp = stampOf(local)
  const remoteStamp = stampOf(remote)

  if (localStamp === remoteStamp) return { row: local, outcome: 'equal' }
  return remoteStamp > localStamp
    ? { row: remote, outcome: 'remote' }
    : { row: local, outcome: 'local' }
}

/**
 * Day rows merge a group at a time, so a tick from one device and a reschedule
 * from another both survive. Fields outside the groups follow the row stamp.
 */
function mergeDailyRow(local: SyncedRow, remote: SyncedRow): RowMerge {
  const base = mergeByRow(local, remote)

  // Equal row stamps are not a reason to stop: a row that already carries one
  // device's merge is stamped at the later of the two, so the two sides meet
  // here with the same stamp and different halves. Only the group stamps can
  // tell them apart.
  const other = base.row === local ? remote : local
  const merged: SyncedRow = { ...base.row }
  const mergedStamps: Partial<Record<DailyFieldGroup, string>> = {
    ...groupStamps(base.row),
  }

  let tookFromOther = false
  const groups = Object.values(DAILY_FIELD_GROUPS) as DailyFieldGroup[]

  groups.forEach((group) => {
    const keptStamp = groupStampOf(base.row, group)
    const otherStamp = groupStampOf(other, group)
    if (otherStamp <= keptStamp) return

    DAILY_GROUP_FIELDS[group].forEach((field) => {
      merged[field] = other[field]
    })
    // Only a stamp someone actually set is carried forward: inventing one for
    // an untouched group would give the merged row a claim it has not earned.
    mergedStamps[group] = otherStamp
    tookFromOther = true
  })

  if (Object.keys(mergedStamps).length > 0) merged.fieldsAt = mergedStamps
  // The row's own stamp has to cover both halves, or the next merge would
  // undo whichever half came from the losing side.
  merged.updatedAt =
    stampOf(local) > stampOf(remote) ? stampOf(local) : stampOf(remote)

  return {
    row: merged,
    outcome: tookFromOther ? 'merged' : base.outcome,
  }
}

/**
 * Goals, task templates and settings merge a group at a time, so an edit to
 * one field group on each device survives. A group comes from the side whose
 * stamp for it is newer; a tie goes to the side stamped later. A field outside
 * every group follows the same rule under its own name, and is kept from the
 * other side when the winner has no value for it, so a newer build's fields
 * are never dropped. Only a named group can be cleared by a newer write.
 */
function mergeGroupedRow(
  groups: FieldGroups,
  local: SyncedRow,
  remote: SyncedRow,
): RowMerge {
  const localStamp = stampOf(local)
  const remoteStamp = stampOf(remote)
  const owner = groupIndexOf(groups)

  // Every group named by either side, so a stamp a newer build wrote for a
  // group this build does not know is carried along.
  const names = new Set<string>([
    ...Object.keys(groups),
    ...Object.keys(fieldStampsOf(local) ?? {}),
    ...Object.keys(fieldStampsOf(remote) ?? {}),
  ])
  const fieldsAt: Record<string, ISODateTime> = {}
  names.forEach((group) => {
    const localAt = stampOfGroup(local, group)
    const remoteAt = stampOfGroup(remote, group)
    const newest = remoteAt > localAt ? remoteAt : localAt
    // Only a stamp someone actually set is carried forward, as for day rows.
    if (newest > EPOCH) fieldsAt[group] = newest
  })

  const remoteWins = (group: string): boolean => {
    const localAt = stampOfGroup(local, group)
    const remoteAt = stampOfGroup(remote, group)
    if (localAt !== remoteAt) return remoteAt > localAt
    return remoteStamp > localStamp
  }

  const merged: SyncedRow = { id: local.id }
  const keys = new Set([...Object.keys(local), ...Object.keys(remote)])
  keys.forEach((key) => {
    if (key === 'updatedAt' || key === 'fieldsAt') return

    const group = owner.get(key) ?? key
    const fromRemote = remoteWins(group)
    const winner = fromRemote ? remote : local
    const loser = fromRemote ? local : remote

    let value = winner[key]
    if (value === undefined && !owner.has(key)) value = loser[key]
    if (value !== undefined) merged[key] = value
  })

  // The row's own stamp has to cover every group, or the server would refuse
  // the write and the next merge would undo the half that came from the loser.
  merged.updatedAt = localStamp > remoteStamp ? localStamp : remoteStamp
  if (Object.keys(fieldsAt).length > 0) merged.fieldsAt = fieldsAt

  const matchesLocal = stableStringify(merged) === stableStringify(local)
  const matchesRemote = stableStringify(merged) === stableStringify(remote)
  const outcome: MergeOutcome =
    matchesLocal && matchesRemote
      ? 'equal'
      : matchesRemote
        ? 'remote'
        : matchesLocal
          ? 'local'
          : 'merged'

  return { row: merged, outcome }
}

export function mergeRow(
  table: TableName,
  local: SyncedRow,
  remote: SyncedRow,
): RowMerge {
  if (table === SYNC_TABLE.DAILY_TASKS) return mergeDailyRow(local, remote)

  const groups = ROW_FIELD_GROUPS[table]
  // A row with no group stamps on either side is a whole row, as it always was.
  if (
    groups === undefined ||
    (fieldStampsOf(local) === undefined && fieldStampsOf(remote) === undefined)
  ) {
    return mergeByRow(local, remote)
  }
  return mergeGroupedRow(groups, local, remote)
}

/** The group names a row of this table is stamped under. */
export function groupNamesOf(table: TableName): string[] {
  if (table === SYNC_TABLE.DAILY_TASKS) return Object.values(DAILY_FIELD_GROUPS)
  return Object.keys(ROW_FIELD_GROUPS[table] ?? {})
}

export type TombstoneIndex = Map<string, ISODateTime>

export function tombstoneKey(table: TableName, id: ID): string {
  return `${table}\u0000${id}`
}

export function indexTombstones(list: Tombstone[]): TombstoneIndex {
  const index: TombstoneIndex = new Map()
  list.forEach((stone) => {
    const key = tombstoneKey(stone.table, stone.id)
    const existing = index.get(key)
    if (existing === undefined || stone.deletedAt > existing) {
      index.set(key, stone.deletedAt)
    }
  })
  return index
}

export interface CollectionMerge {
  /** What the device should now hold. */
  merged: SyncedRow[]
  /** Rows whose winning version is not the one the server has. */
  toPush: SyncedRow[]
  /** Ids the server still holds but this device has buried. */
  toDelete: ID[]
}

/**
 * Brings one table's local and remote rows together. A deletion beats an edit
 * only when it happened later; otherwise the edit revives the row, which is
 * what someone editing on a second device plainly meant.
 */
export function mergeCollection(
  table: TableName,
  local: SyncedRow[],
  remote: SyncedRow[],
  tombstones: TombstoneIndex = new Map(),
): CollectionMerge {
  const remoteById = new Map(remote.map((row) => [row.id, row]))
  const localById = new Map(local.map((row) => [row.id, row]))

  const merged: SyncedRow[] = []
  const toPush: SyncedRow[] = []
  const toDelete: ID[] = []

  local.forEach((localRow) => {
    const remoteRow = remoteById.get(localRow.id)
    const buried = tombstones.get(tombstoneKey(table, localRow.id))

    if (buried !== undefined && buried > stampOf(localRow)) {
      // Buried here after this version was written: do not resurrect it.
      if (remoteRow) toDelete.push(localRow.id)
      return
    }

    if (!remoteRow) {
      merged.push(localRow)
      // A row the server has never seen is new, not deleted: a resurrected row
      // is a nuisance, a lost one is gone for good.
      toPush.push(localRow)
      return
    }

    const result = mergeRow(table, localRow, remoteRow)
    merged.push(result.row)
    if (result.outcome !== 'remote' && result.outcome !== 'equal') {
      toPush.push(result.row)
    }
  })

  remote.forEach((remoteRow) => {
    if (localById.has(remoteRow.id)) return

    const buried = tombstones.get(tombstoneKey(table, remoteRow.id))
    if (buried !== undefined && buried > stampOf(remoteRow)) {
      toDelete.push(remoteRow.id)
      return
    }

    // A row this device has never heard of, or one whose remote edit is newer
    // than our burial of it: take it. On a first login that is simply the other
    // device's history arriving.
    merged.push(remoteRow)
  })

  return { merged, toPush, toDelete }
}

/**
 * A delete still waiting in the queue was made on this device at the stamp the
 * map records. An incoming row no newer than that stays deleted: it is the
 * same version, or an older one. A row edited after the delete was made on
 * another device revives, the same rule mergeIncoming applies to a remote
 * deletion. `revived` names the rows whose queued delete must be dropped, so it
 * is not sent and undo the edit.
 */
export function resolveQueuedDeletes(
  incoming: SyncedRow[],
  queued: ReadonlyMap<ID, ISODateTime>,
): { keep: SyncedRow[]; revived: ID[] } {
  const keep: SyncedRow[] = []
  const revived: ID[] = []

  incoming.forEach((row) => {
    const deletedAt = queued.get(row.id)
    if (deletedAt === undefined) {
      keep.push(row)
      return
    }
    if (stampOf(row) > deletedAt) {
      keep.push(row)
      revived.push(row.id)
    }
  })

  return { keep, revived }
}

/**
 * A later pull only carries what changed, so rows it does not mention must be
 * left exactly as they are. Treating a partial answer like a full one would
 * read every untouched local row as new and push the whole dataset back.
 */
export function mergeIncoming(
  table: TableName,
  local: SyncedRow[],
  incoming: SyncedRow[],
  removedRemotely: Tombstone[] = [],
  tombstones: TombstoneIndex = new Map(),
): CollectionMerge {
  const byId = new Map(local.map((row) => [row.id, row]))
  const toPush: SyncedRow[] = []
  const toDelete: ID[] = []

  incoming.forEach((remoteRow) => {
    const localRow = byId.get(remoteRow.id)

    if (!localRow) {
      const buried = tombstones.get(tombstoneKey(table, remoteRow.id))

      // A row buried here, with nothing locally left to merge, is not simply
      // unknown — it is one this device deleted. The other device can still
      // send it afterwards: it may have been pushing an edit made before the
      // deletion, which arrives later but says nothing newer. Taking it would
      // resurrect the row, so instead the deletion is sent again.
      if (buried !== undefined && buried > stampOf(remoteRow)) {
        toDelete.push(remoteRow.id)
        return
      }

      byId.set(remoteRow.id, remoteRow)
      return
    }

    const result = mergeRow(table, localRow, remoteRow)
    byId.set(remoteRow.id, result.row)
    if (result.outcome === 'local' || result.outcome === 'merged') {
      toPush.push(result.row)
    }
  })

  removedRemotely.forEach((stone) => {
    if (stone.table !== table) return
    const localRow = byId.get(stone.id)
    if (!localRow) return

    // An edit made here after the deletion elsewhere revives the row, and the
    // revival is what gets pushed.
    if (stampOf(localRow) > stone.deletedAt) {
      toPush.push(localRow)
      return
    }
    byId.delete(stone.id)
  })

  return { merged: [...byId.values()], toPush, toDelete }
}
