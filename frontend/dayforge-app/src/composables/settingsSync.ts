import { useSettings, DEFAULT_SETTINGS, type AppSettings } from './useSettings'
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

interface SettingsStamp {
  signature: string
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
    (candidate.updatedAt === undefined || typeof candidate.updatedAt === 'string')
  )
}

function readHeld(): Record<string, unknown> {
  const stored = readJson<unknown>(SETTINGS_HELD_STORAGE_KEY, null)
  return isPlainObject(stored) ? stored : {}
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
      stamp = { signature, updatedAt: new Date().toISOString() }
      writeJson(SETTINGS_SYNC_STORAGE_KEY, stamp)
    }

    const row: SyncedRow = {
      id: SETTINGS_ROW_ID,
      ...withHeld(payload, readHeld()),
    }
    if (stamp.updatedAt !== undefined) row.updatedAt = stamp.updatedAt
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
      update(section, value as Partial<AppSettings[typeof section]>)
    })

    stamp = {
      signature: stableStringify(pick(settings)),
      updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : stamp.updatedAt,
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
