import {
  useSettings,
  DEFAULT_SETTINGS,
  type AppSettings,
  type GoalSettings,
} from './useSettings'
import { readJson, writeJson } from '../lib/storage'
import { stableStringify } from '../sync/diff'
import type { SyncCollection } from '../sync/engine'
import { SYNC_TABLE, type SyncedRow } from '../sync/types'
import {
  heldFromRow,
  isPlainObject,
  SYNCED_SECTIONS,
  withHeld,
  type SyncedSection,
} from './settingsRow'

const SETTINGS_SYNC_STORAGE_KEY = 'dayforge-settings-sync-v1'
const SETTINGS_HELD_STORAGE_KEY = 'dayforge-settings-sync-held-v1'
const SETTINGS_ROW_ID = 'settings'

/**
 * What this device remembers about its settings: the signature they had last,
 * and when each section was last edited. `updatedAt` is the stamp from before
 * sections were stamped one by one; it counts for every section.
 */
interface SettingsStamp {
  signature: string
  fieldsAt?: Record<string, string>
  updatedAt?: string
}

/** The two stamps the settings row carries, as they stand for this device. */
interface RowStamps {
  fieldsAt?: Record<string, string>
  updatedAt?: string
}

function pick(source: AppSettings): Record<SyncedSection, unknown> {
  const payload = {} as Record<SyncedSection, unknown>
  SYNCED_SECTIONS.forEach((section) => {
    payload[section] = JSON.parse(JSON.stringify(source[section]))
  })
  return payload
}

function isStamp(value: unknown): value is SettingsStamp {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<SettingsStamp>
  return (
    typeof candidate.signature === 'string' &&
    (candidate.updatedAt === undefined ||
      typeof candidate.updatedAt === 'string') &&
    (candidate.fieldsAt === undefined || isPlainObject(candidate.fieldsAt))
  )
}

/**
 * Stamps as the row carries them. A stamp with only `updatedAt` came from a
 * build that stamped the whole row, so every section counts as stamped then.
 */
function stampsOf(stamp: SettingsStamp): RowStamps {
  if (stamp.fieldsAt !== undefined) {
    return { fieldsAt: stamp.fieldsAt, updatedAt: stamp.updatedAt }
  }
  const whole = stamp.updatedAt
  if (whole === undefined) return {}
  return {
    fieldsAt: Object.fromEntries(
      SYNCED_SECTIONS.map((section) => [section, whole]),
    ),
    updatedAt: whole,
  }
}

function previousPayload(
  signature: string,
): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(signature)
    return isPlainObject(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

/**
 * The stamp after the settings changed. Only the sections that changed are
 * stamped now; the others keep the stamp they had, so a tweak to one section on
 * this device does not overwrite another section edited on the other device.
 */
function nextStamp(
  previous: SettingsStamp,
  payload: Record<SyncedSection, unknown>,
  now: string,
): SettingsStamp {
  const before = previousPayload(previous.signature)
  const prior = stampsOf(previous).fieldsAt ?? {}
  const fieldsAt: Record<string, string> = {}

  SYNCED_SECTIONS.forEach((section) => {
    const unchanged =
      before !== undefined &&
      stableStringify(before[section]) === stableStringify(payload[section])
    // A new build that only adds settings at their defaults is not an edit.
    const grewWithDefaults =
      before !== undefined &&
      onlyGrewWithDefaults(stableStringify({ [section]: before[section] }), {
        [section]: payload[section],
      })

    if (unchanged || grewWithDefaults) {
      if (prior[section] !== undefined) fieldsAt[section] = prior[section]
      return
    }
    fieldsAt[section] = now
  })

  const stamps = Object.values(fieldsAt)
  const updatedAt = stamps.reduce(
    (latest, at) => (at > latest ? at : latest),
    '',
  )
  return {
    signature: stableStringify(payload),
    fieldsAt: stamps.length > 0 ? fieldsAt : undefined,
    updatedAt: updatedAt === '' ? undefined : updatedAt,
  }
}

function readHeld(): Record<string, unknown> {
  const stored = readJson<unknown>(SETTINGS_HELD_STORAGE_KEY, null)
  return isPlainObject(stored) ? stored : {}
}

/**
 * Whether `current` equals what `previous` recorded once the keys `previous`
 * never had are ignored, and every such key still holds its default value.
 */
function matchesWithDefaults(
  previous: unknown,
  current: unknown,
  defaults: unknown,
): boolean {
  if (!isPlainObject(previous) || !isPlainObject(current)) {
    return stableStringify(previous) === stableStringify(current)
  }
  const fallback = isPlainObject(defaults) ? defaults : {}
  return (
    Object.keys(current).every((key) =>
      key in previous
        ? matchesWithDefaults(previous[key], current[key], fallback[key])
        : stableStringify(current[key]) === stableStringify(fallback[key]),
    ) && Object.keys(previous).every((key) => key in current)
  )
}

export function onlyGrewWithDefaults(
  previousSignature: string,
  payload: Record<string, unknown>,
): boolean {
  try {
    return matchesWithDefaults(
      JSON.parse(previousSignature),
      payload,
      pick(DEFAULT_SETTINGS),
    )
  } catch {
    return false
  }
}

export function createSettingsCollection(): SyncCollection {
  const { settings, update } = useSettings()

  const stored = readJson<unknown>(SETTINGS_SYNC_STORAGE_KEY, null)
  let stamp: SettingsStamp
  if (isStamp(stored)) {
    stamp = stored
  } else {
    const signature = stableStringify(pick(settings))
    const customised = signature !== stableStringify(pick(DEFAULT_SETTINGS))
    stamp = {
      signature,
      updatedAt: customised ? new Date().toISOString() : undefined,
    }
    writeJson(SETTINGS_SYNC_STORAGE_KEY, stamp)
  }

  function read(): SyncedRow[] {
    const payload = pick(settings)
    const signature = stableStringify(payload)
    if (signature !== stamp.signature) {
      stamp = nextStamp(stamp, payload, new Date().toISOString())
      writeJson(SETTINGS_SYNC_STORAGE_KEY, stamp)
    }

    const row: SyncedRow = {
      id: SETTINGS_ROW_ID,
      ...withHeld(payload, readHeld()),
    }
    const stamps = stampsOf(stamp)
    if (stamps.fieldsAt !== undefined) row.fieldsAt = stamps.fieldsAt
    if (stamps.updatedAt !== undefined) row.updatedAt = stamps.updatedAt
    return [row]
  }

  function write(rows: SyncedRow[]) {
    const row = rows.find((item) => item.id === SETTINGS_ROW_ID)
    if (!row) return

    writeJson(
      SETTINGS_HELD_STORAGE_KEY,
      heldFromRow(row, SYNCED_SECTIONS, DEFAULT_SETTINGS),
    )

    SYNCED_SECTIONS.forEach((section) => {
      const value = row[section]
      if (typeof value !== 'object' || value === null) return
      // A cleared income goal is left out of the row, so it is named here to
      // reset the local one; a plain spread would keep the old figure.
      const patch =
        section === 'goals'
          ? { monthlyIncome: (value as GoalSettings).monthlyIncome }
          : value
      update(section, patch as Partial<AppSettings[typeof section]>)
    })

    // The merged row's stamps are what this device now holds; without them,
    // the stamps it had are kept.
    const held = stampsOf(stamp)
    stamp = {
      signature: stableStringify(pick(settings)),
      fieldsAt: isPlainObject(row.fieldsAt)
        ? (row.fieldsAt as Record<string, string>)
        : held.fieldsAt,
      updatedAt:
        typeof row.updatedAt === 'string' ? row.updatedAt : held.updatedAt,
    }
    writeJson(SETTINGS_SYNC_STORAGE_KEY, stamp)
  }

  return {
    table: SYNC_TABLE.SETTINGS,
    track: () => settings,
    read,
    write,
  }
}
