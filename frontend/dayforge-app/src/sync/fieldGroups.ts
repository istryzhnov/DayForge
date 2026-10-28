import type { ISODateTime } from '../entities/types'
import { SYNCED_SECTIONS } from '../composables/settingsRow'
import { stableStringify } from './diff'
import { SYNC_TABLE, type SyncedRow, type TableName } from './types'

/** Older than any real stamp, so a group with no claim always loses. */
export const EPOCH = '1970-01-01T00:00:00.000Z'

/**
 * A row written before stamps existed falls back to its creation time, and
 * then to the epoch — so the side that has been through a migration wins,
 * which is the safe direction.
 */
export function stampOf(row: SyncedRow): ISODateTime {
  return row.updatedAt ?? row.createdAt ?? EPOCH
}

/**
 * Named groups of fields that are edited together. Each group keeps its own
 * stamp, so a rename on one device and a recolour on another are both kept.
 * A field in no group is stamped under its own name, so nothing is dropped.
 */
export type FieldGroups = Readonly<Record<string, readonly string[]>>

export const GOAL_FIELD_GROUPS: FieldGroups = {
  details: ['title', 'description', 'status', 'icon'],
  look: ['theme', 'accentColor'],
  money: ['hourlyRate', 'clientId', 'billing', 'budget'],
  board: ['boardEnabled', 'notes'],
  order: ['order'],
}

export const TASK_TEMPLATE_FIELD_GROUPS: FieldGroups = {
  text: ['title', 'notes'],
  schedule: ['startTime', 'endTime', 'recurrence', 'isActive'],
  structure: ['goalId', 'parentTemplateId', 'priority', 'tagIds'],
  // The board Done clear is part of the board, so it moves with the stage.
  board: ['boardStage', 'boardClearedAt'],
  order: ['order'],
  money: ['hourlyRate'],
}

/** Each synced section is its own group, so two devices can edit two sections. */
export const SETTINGS_FIELD_GROUPS: FieldGroups = Object.fromEntries(
  SYNCED_SECTIONS.map((section) => [section, [section]]),
)

/**
 * The tables whose rows merge by group. Day rows keep their own groups, and
 * the timer is a single row, so neither is listed.
 */
export const ROW_FIELD_GROUPS: Partial<Record<TableName, FieldGroups>> = {
  [SYNC_TABLE.GOALS]: GOAL_FIELD_GROUPS,
  [SYNC_TABLE.TASK_TEMPLATES]: TASK_TEMPLATE_FIELD_GROUPS,
  [SYNC_TABLE.SETTINGS]: SETTINGS_FIELD_GROUPS,
}

/**
 * Fields that are never edits of their own: identity, creation, the burial
 * marker and the stamps themselves. Changing one of them does not stamp a group.
 */
const UNSTAMPED_FIELDS = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'fieldsAt',
  'deletedAt',
])

/** The stamps a row carries, or undefined for a row from before they existed. */
export function fieldStampsOf(
  row: SyncedRow,
): Record<string, ISODateTime> | undefined {
  const raw = row.fieldsAt
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return undefined
  }
  const stamps: Record<string, ISODateTime> = {}
  Object.entries(raw).forEach(([group, at]) => {
    if (typeof at === 'string') stamps[group] = at
  })
  return stamps
}

/** Which named group a field belongs to, if any. */
export function groupIndexOf(groups: FieldGroups): Map<string, string> {
  const owner = new Map<string, string>()
  Object.entries(groups).forEach(([group, fields]) => {
    fields.forEach((field) => owner.set(field, group))
  })
  return owner
}

/**
 * How recently this row's idea of one group was formed. A row that keeps
 * stamps but has none for this group never touched it, so it has no claim on
 * it. A row whose own stamp is newer than every group stamp was written by a
 * build that does not keep them, so that write counts as touching every group.
 * A row from before stamps existed has only its row stamp to go on.
 */
export function stampOfGroup(row: SyncedRow, group: string): ISODateTime {
  const stamps = fieldStampsOf(row)
  if (stamps === undefined) return stampOf(row)

  const newest = Object.values(stamps).reduce(
    (latest, at) => (at > latest ? at : latest),
    EPOCH,
  )
  if (stampOf(row) > newest) return stampOf(row)
  return stamps[group] ?? EPOCH
}

/**
 * Stamps the groups an edit touched. `previous` is the row as it was last
 * seen; without it the row is new, and every group is stamped so the row
 * carries a complete set. Returns whether this changed the row.
 */
export function stampChangedGroups(
  previous: SyncedRow | undefined,
  row: SyncedRow,
  groups: FieldGroups,
  now: ISODateTime,
): boolean {
  const owner = groupIndexOf(groups)
  const names = Object.keys(groups)

  const keys = new Set<string>(Object.keys(row))
  if (previous !== undefined) {
    Object.keys(previous).forEach((key) => keys.add(key))
  }
  const touched = new Set<string>()
  keys.forEach((key) => {
    if (UNSTAMPED_FIELDS.has(key)) return
    if (previous !== undefined && sameValue(previous[key], row[key])) return
    touched.add(owner.get(key) ?? key)
  })

  if (previous === undefined) names.forEach((group) => touched.add(group))
  if (touched.size === 0) {
    // Only the row stamp moved, and no field did. Putting the old stamp back
    // stops it from claiming every group and overwriting another device's edit.
    if (previous === undefined) return false
    const moved =
      stableStringify(previous.updatedAt) !== stableStringify(row.updatedAt)
    row.updatedAt = previous.updatedAt
    return moved
  }

  const stamps: Record<string, ISODateTime> = {}
  if (previous !== undefined) {
    // Fields outside the named groups keep whatever stamps they had.
    Object.assign(stamps, fieldStampsOf(previous) ?? {})
    names.forEach((group) => {
      stamps[group] = stampOfGroup(previous, group)
    })
  }
  touched.forEach((group) => {
    stamps[group] = now
  })

  row.fieldsAt = stamps
  row.updatedAt = now
  return true
}

function sameValue(left: unknown, right: unknown): boolean {
  return stableStringify(left) === stableStringify(right)
}
