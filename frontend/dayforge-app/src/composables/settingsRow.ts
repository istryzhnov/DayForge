import type { AppSettings } from './useSettings'

export const SYNCED_SECTIONS = [
  'notifications',
  'calendar',
  'behavior',
  'format',
  'timer',
  'goals',
  'billing',
] as const satisfies ReadonlyArray<keyof AppSettings>

export type SyncedSection = (typeof SYNCED_SECTIONS)[number]

const NOT_SETTINGS_KEYS = new Set(['id', 'updatedAt', 'createdAt'])

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function heldFromRow(
  row: Record<string, unknown>,
  syncedSections: readonly string[],
  defaults: object,
): Record<string, unknown> {
  const known = defaults as Record<string, unknown>
  const held: Record<string, unknown> = {}

  Object.keys(row).forEach((key) => {
    if (NOT_SETTINGS_KEYS.has(key)) return
    const value = row[key]

    if (!syncedSections.includes(key)) {
      held[key] = value
      return
    }
    if (!isPlainObject(value) || !isPlainObject(known[key])) return

    const names = Object.keys(known[key] as object)
    const extra = Object.keys(value).filter((field) => !names.includes(field))
    if (extra.length === 0) return
    held[key] = Object.fromEntries(extra.map((field) => [field, value[field]]))
  })

  return held
}

export function withHeld(
  payload: Record<string, unknown>,
  held: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...held }

  Object.keys(payload).forEach((key) => {
    const extra = held[key]
    const value = payload[key]
    result[key] =
      isPlainObject(extra) && isPlainObject(value)
        ? { ...extra, ...value }
        : value
  })

  return result
}
