/** Compat checks: sync merge, restore and backup keep fields from newer builds. */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { diffRows, snapshotRows, stableStringify } from '../../../src/sync/diff'
import { onlyGrewWithDefaults } from '../../../src/composables/settingsSync'
import { mergeCollection, mergeRow } from '../../../src/sync/merge'
import { partitionLive, restampForRestore } from '../../../src/sync/tombstoneRules'
import { SYNC_TABLE, type SyncedRow } from '../../../src/sync/types'
import { migrateDailyTasks } from '../../../src/composables/goalSpace/dailyTasks'
import { migrateGoals } from '../../../src/composables/goalSpace/goalMigration'
import { splitReadableEntries } from '../../../src/composables/timer/entries'
import { isKnownTimerStatus, sanitizeActiveTimer } from '../../../src/composables/timer/sanitize'
import { heldFromRow, SYNCED_SECTIONS, withHeld } from '../../../src/composables/settingsRow'
import { DEFAULT_SETTINGS } from '../../../src/composables/useSettings'
import { appStorageKeys, clearLocalAppData, isDeleteConfirmed } from '../../../src/sync/accountDeletion'
import { parseBackupFile } from '../../../src/features/settings/composables/backupFormat'
import type { Goal } from '../../../src/entities/GoalEntity'
import type { DailyTask } from '../../../src/entities/TaskEntity'
import { FUTURE, T0, T1, T2, check, clone, dailyRow, goalRow, same, section } from './harness'

export function verifyRowsFromNewerBuild() {
  section('Rows from a newer build keep their unknown fields')

  const goal = goalRow()
  migrateGoals([goal] as unknown as Goal[])
  check('project keeps futureField through migrateGoals', same(goal.futureField, FUTURE.futureField))

  const legacy = goalRow({ accentColor: '#ff0000' })
  migrateGoals([legacy] as unknown as Goal[])
  check(
    'legacy accentColor is moved to theme, futureField kept',
    same(legacy.futureField, FUTURE.futureField) && same(legacy.theme, { accent: '#ff0000' }),
  )

  const onHold = goalRow({ status: 'on-hold' })
  migrateGoals([onHold] as unknown as Goal[])
  check('unknown project status is kept as written', onHold.status === 'on-hold')

  const template = { ...goalRow({ id: 'task-a', title: 'Task' }) }
  const liveTemplates = partitionLive(SYNC_TABLE.TASK_TEMPLATES, [template]).live
  check('task template keeps futureField through partitionLive', same(liveTemplates[0].futureField, FUTURE.futureField))

  const daily = dailyRow()
  const migrated = migrateDailyTasks([daily as unknown as DailyTask])
  check('daily task keeps futureField through migrateDailyTasks', same((migrated[0] as unknown as SyncedRow).futureField, FUTURE.futureField))

  const entry = {
    id: 'entry-1',
    sessionId: 's1',
    startedAt: T0,
    endedAt: T1,
    mode: 'stopwatch',
    source: 'timer',
    updatedAt: T1,
    ...FUTURE,
  }
  const broken = { id: 'entry-2', startedAt: 'not a date', endedAt: T1, futureField: 'kept' }
  const split = splitReadableEntries([entry, broken])
  check('time entry keeps futureField through the readable split', same(split.readable[0], entry))
  check('unreadable time entry is kept untouched, not dropped', split.unreadable.length === 1 && same(split.unreadable[0], broken))

  const timer = sanitizeActiveTimer({
    sessionId: 's1',
    mode: 'stopwatch',
    status: 'running',
    startedAt: 1,
    accumulatedMs: 0,
    completedFocusCount: 0,
    ...FUTURE,
  })
  check('active timer keeps futureField through sanitize', same((timer as unknown as SyncedRow).futureField, FUTURE.futureField))
  check('active timer with an unknown status is not adopted as running', !isKnownTimerStatus('paused-long') && sanitizeActiveTimer({ status: 'paused-long' }).status === 'idle')
}

export function verifyMergeKeepsUnknownFields() {
  section('Merge keeps unknown fields in both directions')

  const older = dailyRow({ updatedAt: T0, futureField: 'older' })
  const newer = dailyRow({ updatedAt: T2, futureField: 'newer', status: 'done', completedAt: T2 })

  const localNewer = mergeRow(SYNC_TABLE.DAILY_TASKS, newer, older)
  check('daily row: local newer keeps local futureField', localNewer.row.futureField === 'newer')
  const remoteNewer = mergeRow(SYNC_TABLE.DAILY_TASKS, older, newer)
  check('daily row: remote newer keeps remote futureField', remoteNewer.row.futureField === 'newer')

  const goalLocal = goalRow({ updatedAt: T0, futureField: 'local-old' })
  const goalRemote = goalRow({ updatedAt: T1, futureField: 'remote-new' })
  check('project: newer remote wins whole row, futureField included', mergeRow(SYNC_TABLE.GOALS, goalLocal, goalRemote).row.futureField === 'remote-new')
  check('project: newer local wins whole row, futureField included', mergeRow(SYNC_TABLE.GOALS, goalRemote, goalLocal).row.futureField === 'remote-new')

  const remoteTime = dailyRow({
    status: 'todo',
    startTime: '11:00',
    endTime: '12:00',
    fieldsAt: { time: T2 },
    updatedAt: T2,
    futureField: 'b',
  })
  const localStatus = dailyRow({
    status: 'done',
    completedAt: T1,
    startTime: '09:00',
    endTime: '10:00',
    fieldsAt: { status: T1 },
    updatedAt: T1,
    futureField: 'a',
  })
  const groups = mergeRow(SYNC_TABLE.DAILY_TASKS, remoteTime, localStatus).row
  check('daily row: groups still merge per field group', groups.status === 'done' && groups.startTime === '11:00')
  check('daily row: unknown field of the row winner survives a group merge', groups.futureField === 'b')

  const remoteOnly = mergeCollection(
    SYNC_TABLE.GOALS,
    [],
    [goalRow({ id: 'goal-new', futureField: 'from-remote' })],
  )
  check('collection merge takes a row only the remote has, futureField included', remoteOnly.merged[0]?.futureField === 'from-remote')

  const before = snapshotRows([goalRow({ id: 'g' })])
  const edited = diffRows(before, [goalRow({ id: 'g', futureField: 'changed' })])
  check('a change to an unknown field alone is seen as a change', edited.changes.length === 1 && edited.changes[0].op === 'upsert')

  const reordered = diffRows(before, [{ updatedAt: T1, futureField: { level: 2, mode: 'new' }, title: 'Work', status: 'active', createdAt: T0, id: 'g' } as SyncedRow])
  check('key order of an unknown object is not a change', reordered.changes.length === 0)
}

export function verifyRestoreKeepsUnknownFields() {
  section('Restore keeps unknown fields and group stamps')

  const before = new Date().toISOString()
  const restored = restampForRestore(
    dailyRow({ deletedAt: T2, fieldsAt: { status: T1, notes: T1 } }),
  )
  check('restore restamps the row as a current edit', (restored.updatedAt ?? '') >= before)
  check('restore drops the burial marker', restored.deletedAt === undefined)
  check('restore keeps futureField', same(restored.futureField, FUTURE.futureField))
  const stamps = (restored.fieldsAt ?? {}) as Record<string, unknown>
  check('restore keeps a group stamp this build does not know', 'notes' in stamps)
  check('restore restamps every known group too', ['status', 'time', 'date'].every((group) => stamps[group] === restored.updatedAt))

  const plain = restampForRestore(goalRow())
  check('restore on a row without group stamps adds none', !('fieldsAt' in plain) && same(plain.futureField, FUTURE.futureField))
}

export function verifySettingsRow() {
  section('Settings row keeps sections and fields this build does not know')

  const remote: Record<string, unknown> = {
    id: 'settings',
    updatedAt: T1,
    ...clone(DEFAULT_SETTINGS),
    behavior: { ...clone(DEFAULT_SETTINGS.behavior), dashboardLayout: 'grid' },
    privacy: { shareStats: false },
  }

  const held = heldFromRow(remote, SYNCED_SECTIONS, DEFAULT_SETTINGS)
  check('unknown field inside a synced section is held', same(held.behavior, { dashboardLayout: 'grid' }))
  check('unknown section is held whole', same(held.privacy, { shareStats: false }))
  check('row bookkeeping is not held', !('id' in held) && !('updatedAt' in held))
  check('known sections are not held', !('notifications' in held) && !('timer' in held))

  const local = clone(DEFAULT_SETTINGS)
  const localSections = SYNCED_SECTIONS.reduce<Record<string, unknown>>((acc, section) => {
    acc[section] = local[section]
    return acc
  }, {})
  localSections.notifications = { ...(localSections.notifications as object), leadMinutes: 15 }

  const out = withHeld(localSections, held)
  check('read returns the unknown section it was given', same(out.privacy, { shareStats: false }))
  check('read returns the unknown field inside a synced section', (out.behavior as Record<string, unknown>).dashboardLayout === 'grid')
  check('read still carries the local change', (out.notifications as Record<string, unknown>).leadMinutes === 15)
  check('read keeps the known fields of the section', (out.behavior as Record<string, unknown>).startView === DEFAULT_SETTINGS.behavior.startView)

  const again = heldFromRow({ id: 'settings', updatedAt: T2, ...out }, SYNCED_SECTIONS, DEFAULT_SETTINGS)
  check('a write-read-write cycle holds the same extras', same(again, held))

  const bare: Record<string, unknown> = { id: 'settings' }
  SYNCED_SECTIONS.forEach((section) => {
    bare[section] = clone(DEFAULT_SETTINGS[section])
  })
  const removed = heldFromRow(bare, SYNCED_SECTIONS, DEFAULT_SETTINGS)
  check('a field the other device removed is no longer held', Object.keys(removed).length === 0)

  section('Settings stamp survives an update that only adds defaults')
  const current = JSON.parse(JSON.stringify(localSections)) as Record<string, unknown>
  const older = JSON.parse(JSON.stringify(current)) as Record<string, Record<string, unknown>>
  delete older.billing
  delete older.goals
  delete older.timer.longRunHours
  const olderSignature = stableStringify(older)
  check('new sections and fields at their defaults are not an edit', onlyGrewWithDefaults(olderSignature, current))
  const edited = { ...current, notifications: { ...(current.notifications as object), leadMinutes: 30 } }
  check('a real change still counts as an edit', !onlyGrewWithDefaults(olderSignature, edited))
  const customised = { ...current, timer: { ...(current.timer as object), longRunHours: 6 } }
  check('a new field set away from its default counts as an edit', !onlyGrewWithDefaults(olderSignature, customised))
  check('an unreadable stamp counts as an edit', !onlyGrewWithDefaults('not json', current))

  const beforeNudgeTime = JSON.parse(JSON.stringify(current)) as Record<string, Record<string, unknown>>
  delete beforeNudgeTime.notifications.endOfDayTime
  check('the evening nudge time at its default is not an edit', onlyGrewWithDefaults(stableStringify(beforeNudgeTime), current))
  const movedNudge = { ...current, notifications: { ...(current.notifications as object), endOfDayTime: '21:00' } }
  check('an evening nudge time moved off its default is an edit', !onlyGrewWithDefaults(stableStringify(beforeNudgeTime), movedNudge))
}

export function verifyBackupFixture() {
  section('Backup v1 fixture parses without losing a field')

  const fixturePath = join(process.cwd(), 'tests', 'sync', 'fixtures', 'backup-v1.json')
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as Record<string, unknown>
  const parsed = parseBackupFile(fixture)

  check('fixture is accepted as a backup', parsed !== null)
  if (!parsed) return

  check('fixture is version 1, not flagged as newer', parsed.version === 1 && parsed.newerVersion === false)
  check('two projects survive', parsed.goals.length === 2)
  check('three task templates survive', parsed.taskTemplates.length === 3)
  check('three daily tasks survive', parsed.dailyTasks.length === 3)
  check('three time entries survive', (parsed.timeEntries ?? []).length === 3)
  check('projects are kept field for field', same(parsed.goals, fixture.goals))
  check('task templates are kept field for field', same(parsed.taskTemplates, fixture.taskTemplates))
  check('daily tasks are kept field for field', same(parsed.dailyTasks, fixture.dailyTasks))
  check('time entries are kept field for field', same(parsed.timeEntries, fixture.timeEntries))
  check('theme is kept field for field', same(parsed.theme, fixture.theme))
  check('settings are kept field for field', same(parsed.settings, fixture.settings))

  const withoutEntries = { ...clone(fixture), timeEntries: undefined }
  const older = parseBackupFile(withoutEntries)
  check('a backup from before the timer existed gives no entries', older !== null && same(older.timeEntries, []))
}

export function verifyNewerBackup() {
  section('Backup from a newer build (version 99) is accepted with its fields')

  const fixturePath = join(process.cwd(), 'tests', 'sync', 'fixtures', 'backup-v1.json')
  const future = JSON.parse(readFileSync(fixturePath, 'utf8')) as Record<string, any>
  future.version = 99
  future.goals[0].futureField = { color: 'teal' }
  future.dailyTasks[0].futureField = 'x'
  future.timeEntries[0].futureField = 42
  future.settings.behavior.dashboardLayout = 'grid'
  future.theme.workspace.grid = 'lines'
  future.extraTopLevel = { ignored: true }

  const parsed = parseBackupFile(future)
  check('a version 99 backup is accepted, not rejected', parsed !== null)
  if (!parsed) return

  check('it is flagged as newer', parsed.newerVersion === true && parsed.version === 99)
  check('project field from the newer build is kept', same((parsed.goals[0] as unknown as SyncedRow).futureField, { color: 'teal' }))
  check('daily task field from the newer build is kept', (parsed.dailyTasks[0] as unknown as SyncedRow).futureField === 'x')
  check('time entry field from the newer build is kept', ((parsed.timeEntries ?? [])[0] as unknown as SyncedRow).futureField === 42)
  check('settings field from the newer build is kept', (parsed.settings as Record<string, Record<string, unknown>>).behavior.dashboardLayout === 'grid')
  check('theme field from the newer build is kept', (parsed.theme as Record<string, Record<string, unknown>>).workspace.grid === 'lines')

  const restored = restampForRestore(parsed.dailyTasks[0] as unknown as SyncedRow)
  check('a restore from it keeps the field too', restored.futureField === 'x')
}

export function verifyAccountDeletionWipe() {
  section('account deletion: local wipe')

  const store = new Map<string, string>([
    ['dayforge-goals', '[]'],
    ['dayforge-sync-outbox-v1', '{"pending":[],"dead":[],"seq":0}'],
    ['dayforge-auth-v1', '{}'],
    ['unrelated-key', 'kept'],
  ])
  const storage = {
    get length() {
      return store.size
    },
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => {
      store.delete(key)
    },
  }

  check(
    'finds only the app keys, auth session included',
    same(appStorageKeys(storage).sort(), [
      'dayforge-auth-v1',
      'dayforge-goals',
      'dayforge-sync-outbox-v1',
    ]),
  )

  const removed = clearLocalAppData(storage)
  check('reports how many keys it removed', removed === 3, removed)
  check(
    'leaves keys that are not the app\'s alone',
    same([...store.keys()], ['unrelated-key']),
    [...store.keys()],
  )
  check('a second wipe removes nothing', clearLocalAppData(storage) === 0)

  check(
    'the confirmation word must be typed exactly, padding aside',
    isDeleteConfirmed(' DELETE ') &&
      !isDeleteConfirmed('delete') &&
      !isDeleteConfirmed('DELETE!') &&
      !isDeleteConfirmed(''),
  )
}
