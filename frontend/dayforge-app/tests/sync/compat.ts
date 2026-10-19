/**
 * Forward compatibility: a row written by a newer build carries fields this
 * build does not know, and an older build must hand them back unchanged.
 *
 *     npm run verify:sync
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { diffRows, snapshotRows, stableStringify } from '../../src/sync/diff'
import { mergeCollection, mergeRow } from '../../src/sync/merge'
import { partitionLive, restampForRestore } from '../../src/sync/tombstoneRules'
import { SYNC_TABLE, type SyncedRow } from '../../src/sync/types'
import { migrateDailyTasks } from '../../src/composables/goalSpace/dailyTasks'
import { migrateGoals } from '../../src/composables/goalSpace/goalMigration'
import { NOTES_MAX_LENGTH, normalizeNotes } from '../../src/composables/goalSpace/notes'
import { splitReadableEntries } from '../../src/composables/timer/entries'
import {
  isKnownTimerStatus,
  sanitizeActiveTimer,
} from '../../src/composables/timer/sanitize'
import {
  heldFromRow,
  SYNCED_SECTIONS,
  withHeld,
} from '../../src/composables/settingsRow'
import { DEFAULT_SETTINGS } from '../../src/composables/useSettings'
import { parseBackupFile } from '../../src/features/settings/composables/backupFormat'
import type { Goal } from '../../src/entities/GoalEntity'
import { describeRecurrence } from '../../src/composables/goalSpace/recurrence'
import { collectUpcoming } from '../../src/features/tasks/composables/useUpcomingTasks'
import type { DailyTask, TaskTemplate } from '../../src/entities/TaskEntity'
import { BOARD_COLUMN, buildBoardCards, columnOf, planBoardMove } from '../../src/features/board/composables/boardModel'
import {
  parseBillingDraft,
  projectFigures,
  sameBilling,
  sanitizeBilling,
} from '../../src/features/analytics/composables/projectBilling'

let failures = 0
let checks = 0

function check(label: string, condition: boolean, detail?: unknown) {
  checks += 1
  if (condition) {
    console.log(`  ok   ${label}`)
    return
  }
  failures += 1
  console.log(`  FAIL ${label}`)
  if (detail !== undefined) console.log(`       ${stableStringify(detail)}`)
}

function section(title: string) {
  console.log(`\n${title}`)
}

function same(left: unknown, right: unknown): boolean {
  return stableStringify(left) === stableStringify(right)
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

const T0 = '2026-09-01T10:00:00.000Z'
const T1 = '2026-09-02T10:00:00.000Z'
const T2 = '2026-09-03T10:00:00.000Z'

const FUTURE = { futureField: { mode: 'new', level: 2 } }

function dailyRow(overrides: Record<string, unknown> = {}): SyncedRow {
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

function goalRow(overrides: Record<string, unknown> = {}): SyncedRow {
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

function templateRow(overrides: Record<string, unknown> = {}): SyncedRow {
  return {
    id: 'task-report',
    goalId: 'goal-a',
    title: 'Monthly report',
    priority: 'minor',
    order: 0,
    tagIds: [],
    isActive: true,
    createdAt: T0,
    updatedAt: T0,
    ...FUTURE,
    ...overrides,
  } as SyncedRow
}

function verifyTaskNotes() {
  section('Task notes survive sync, restore and the outbox')

  const table = SYNC_TABLE.TASK_TEMPLATES
  const withNotes = templateRow({ notes: 'Call the bank\nAsk about fees', updatedAt: T1 })
  const older = templateRow({ notes: 'Call the bank', updatedAt: T0 })

  const kept = mergeRow(table, withNotes, older)
  check('a newer local note wins with its full text', kept.row.notes === withNotes.notes, kept.row)

  const incoming = templateRow({ notes: 'From the phone', updatedAt: T2 })
  const taken = mergeRow(table, withNotes, incoming)
  check('a newer remote note is taken whole', taken.row.notes === 'From the phone', taken.row)

  const cleared = templateRow({ updatedAt: T2 })
  const dropped = mergeRow(table, cleared, older)
  check('a note cleared on one device stays cleared after merge', !('notes' in dropped.row), dropped.row)

  const restored = restampForRestore(withNotes)
  check('a restore keeps the note', restored.notes === withNotes.notes)

  const shadow = snapshotRows([templateRow({ updatedAt: T0 })])
  const diff = diffRows(shadow, [templateRow({ notes: 'New note', updatedAt: T1 })])
  check('adding a note is a change the outbox sees', diff.changes.length === 1 && diff.changes[0].op === 'upsert')

  check('a template without notes is untouched by the diff', diffRows(snapshotRows([templateRow()]), [templateRow()]).changes.length === 0)

  check('notes are trimmed', normalizeNotes('  Buy milk \n') === 'Buy milk')
  check('blank notes mean no note at all', normalizeNotes(' \n\t ') === undefined)
  check('notes are capped at the limit', (normalizeNotes('x'.repeat(NOTES_MAX_LENGTH + 50)) ?? '').length === NOTES_MAX_LENGTH)
}

function verifyRowsFromNewerBuild() {
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

function verifyMergeKeepsUnknownFields() {
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

function verifyRestoreKeepsUnknownFields() {
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

function verifySettingsRow() {
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
}

function verifyBackupFixture() {
  section('Backup v1 fixture parses without losing a field')

  const fixturePath = join(__dirname, '..', '..', '..', 'tests', 'sync', 'fixtures', 'backup-v1.json')
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

function verifyNewerBackup() {
  section('Backup from a newer build (version 99) is accepted with its fields')

  const fixturePath = join(__dirname, '..', '..', '..', 'tests', 'sync', 'fixtures', 'backup-v1.json')
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

function verifyProjectNotes() {
  section('Project notes travel with the project row')

  const withNotes = goalRow({ id: 'goal-n', notes: 'Ideas\n\nlinks', updatedAt: T1 })
  const withoutNotes = goalRow({ id: 'goal-n', updatedAt: T0 })
  check(
    'notes survive a whole-row merge in either direction',
    mergeRow(SYNC_TABLE.GOALS, withoutNotes, withNotes).row.notes === 'Ideas\n\nlinks' &&
      mergeRow(SYNC_TABLE.GOALS, withNotes, withoutNotes).row.notes === 'Ideas\n\nlinks',
  )

  const migrated = clone(withNotes) as unknown as Goal
  migrateGoals([migrated])
  check('notes are kept through migrateGoals', migrated.notes === 'Ideas\n\nlinks')

  const backup = parseBackupFile({
    format: 'dayforge-backup',
    version: 1,
    goals: [clone(withNotes)],
    taskTemplates: [],
    dailyTasks: [],
  })
  check('notes survive a backup round trip', backup !== null && backup.goals[0].notes === 'Ideas\n\nlinks')

  check('a project without notes has no notes key', !('notes' in goalRow({ id: 'goal-m' })))
  check('blank notes normalise to nothing', normalizeNotes('  \n ') === undefined)
}

function verifyBoardFields() {
  section('Board fields travel and read safely both ways')

  const project = goalRow({ id: 'goal-b', boardEnabled: true })
  const projectOff = goalRow({ id: 'goal-b', updatedAt: T0 })
  const projectOn = goalRow({ id: 'goal-b', boardEnabled: true, updatedAt: T1 })
  check(
    'boardEnabled survives a whole-row merge in either direction',
    mergeRow(SYNC_TABLE.GOALS, projectOff, projectOn).row.boardEnabled === true &&
      mergeRow(SYNC_TABLE.GOALS, projectOn, projectOff).row.boardEnabled === true,
  )
  const migratedProject = clone(project) as unknown as Goal
  migrateGoals([migratedProject])
  check('boardEnabled is kept through migrateGoals', migratedProject.boardEnabled === true)

  const task = { ...goalRow({ id: 'task-b', title: 'Task' }), boardStage: 'doing', isActive: true, parentTemplateId: undefined }
  const liveTask = partitionLive(SYNC_TABLE.TASK_TEMPLATES, [clone(task)]).live[0]
  check('boardStage survives partitionLive', liveTask.boardStage === 'doing')

  const taskOther = { ...clone(task), updatedAt: T2 }
  const taskStale = { ...clone(task), boardStage: undefined, updatedAt: T0 }
  check(
    'boardStage is not lost when a newer edit comes from another device',
    mergeCollection(SYNC_TABLE.TASK_TEMPLATES, [taskStale], [taskOther]).merged[0]?.boardStage === 'doing',
  )

  const restored = restampForRestore(clone(task) as unknown as SyncedRow)
  check('boardStage survives a restore from undo', restored.boardStage === 'doing')

  const backup = parseBackupFile({
    format: 'dayforge-backup',
    version: 1,
    goals: [clone(project)],
    taskTemplates: [clone(task)],
    dailyTasks: [],
  })
  check(
    'boardEnabled and boardStage survive a backup round trip',
    backup !== null &&
      backup.goals[0].boardEnabled === true &&
      (backup.taskTemplates[0] as unknown as SyncedRow).boardStage === 'doing',
  )

  const plainOld = { ...goalRow({ id: 'goal-c' }), updatedAt: T0 }
  check('a project without the flag has no boardEnabled key', !('boardEnabled' in plainOld))

  const row = dailyRow({ templateId: 'task-b', id: 'task-b::2026-09-02' }) as unknown as DailyTask
  const unknownStage = { ...task, boardStage: 'review' } as unknown as TaskTemplate
  check('an unknown stage from a newer build reads as todo', columnOf(row, unknownStage) === BOARD_COLUMN.TODO)
  check('a missing stage reads as todo', columnOf(row, { ...task, boardStage: undefined } as unknown as TaskTemplate) === BOARD_COLUMN.TODO)
  check('a doing stage reads as in progress', columnOf(row, task as unknown as TaskTemplate) === BOARD_COLUMN.DOING)
  check('a done row reads as done whatever its stage', columnOf({ ...row, status: 'done' }, task as unknown as TaskTemplate) === BOARD_COLUMN.DONE)

  const cards = buildBoardCards([row, { ...row, id: 'task-b::2026-09-03', templateId: 'other', parentDailyTaskId: row.id }], [task as unknown as TaskTemplate])
  check('a nested row is counted on its parent card, not shown twice', cards.doing.length === 1 && cards.todo.length === 0 && cards.doing[0].subtasksTotal === 1)

  const oneOff = task as unknown as TaskTemplate
  const repeating = { ...task, recurrence: { type: 'daily', startDate: '2026-09-01' } } as unknown as TaskTemplate
  check('moving a one-off to done only toggles it', same(planBoardMove(row, oneOff, BOARD_COLUMN.DONE), { toggleDone: true, stage: undefined }))
  check('finishing a repeating task clears its stage', same(planBoardMove(row, repeating, BOARD_COLUMN.DONE), { toggleDone: true, stage: null }))
  const doneRow = { ...row, status: 'done' } as unknown as DailyTask
  check('moving out of done un-completes it and sets the stage', same(planBoardMove(doneRow, oneOff, BOARD_COLUMN.DOING), { toggleDone: true, stage: 'doing' }))
  check('moving back to to do clears the stage', same(planBoardMove(row, oneOff, BOARD_COLUMN.TODO), { toggleDone: false, stage: null }))
}

/** Analytics-only project figures: sync, backup, validation and the period math. */
function verifyProjectBilling() {
  section('Project billing (analytics only)')

  const HOUR = 60 * 60 * 1000
  const near = (left: number, right: number) => Math.abs(left - right) < 1e-9

  const priced = goalRow({
    id: 'goal-d',
    billing: { fixedPrice: 1200, manualHours: 14, note: 'invoice 3' },
    updatedAt: T1,
  })
  const plain = goalRow({ id: 'goal-d', updatedAt: T0 })

  check(
    'billing survives a whole-row merge in either direction',
    same(mergeRow(SYNC_TABLE.GOALS, plain, priced).row.billing, priced.billing) &&
      same(mergeRow(SYNC_TABLE.GOALS, priced, plain).row.billing, priced.billing),
  )

  const backup = parseBackupFile({
    format: 'dayforge-backup',
    version: 1,
    goals: [clone(priced)],
    taskTemplates: [],
    dailyTasks: [],
  })
  check(
    'billing survives a backup round trip',
    backup !== null && same(backup.goals[0].billing, priced.billing),
  )

  const oldGoal = goalRow({ id: 'goal-e' }) as unknown as Goal
  migrateGoals([oldGoal])
  check('a project without billing keeps no billing key', !('billing' in oldGoal))

  check(
    'sanitize keeps valid figures and trims the note',
    same(
      sanitizeBilling({ fixedPrice: -5, manualHours: 3, note: '  hi  ' }),
      { manualHours: 3, note: 'hi' },
    ),
  )
  check(
    'sanitize drops non-finite and over-limit figures',
    sanitizeBilling({ fixedPrice: Number.NaN }) === undefined &&
      sanitizeBilling({ fixedPrice: 10_000_001 }) === undefined &&
      sanitizeBilling({ manualHours: 100_001 }) === undefined &&
      sanitizeBilling({}) === undefined,
  )

  const cleared = parseBillingDraft({ fixedPrice: '', manualHours: ' ', note: '' })
  check('an empty draft means no billing at all', cleared.ok && cleared.billing === undefined)
  const comma = parseBillingDraft({ fixedPrice: '', manualHours: '1,5', note: '' })
  check('a comma decimal is read as a point', comma.ok && comma.billing?.manualHours === 1.5)
  check(
    'a non-number is refused, not stored',
    !parseBillingDraft({ fixedPrice: 'abc', manualHours: '', note: '' }).ok,
  )
  check(
    'hours above the limit are refused',
    !parseBillingDraft({ fixedPrice: '', manualHours: '100001', note: '' }).ok,
  )
  check(
    'sameBilling detects a real change only',
    sameBilling({ fixedPrice: 1 }, { fixedPrice: 1 }) &&
      !sameBilling({ fixedPrice: 1 }, undefined) &&
      !sameBilling({ fixedPrice: 1 }, { fixedPrice: 2 }),
  )

  const base = { periodEarned: 0, allTimeEarned: 0, fallbackRate: 50 }

  const allTime = projectFigures({
    ...base,
    periodMs: 10 * HOUR,
    allTimeMs: 10 * HOUR,
    allTimeEarned: 500,
    isAllTime: true,
  })
  check(
    'All time without billing keeps tracked hours and earnings',
    allTime.ms === 10 * HOUR && allTime.earned === 500 && allTime.fixedBasis === null && allTime.effectiveRate === 50,
  )

  const prorata = projectFigures({
    ...base,
    periodMs: 2 * HOUR,
    allTimeMs: 10 * HOUR,
    allTimeEarned: 500,
    isAllTime: false,
    billing: { fixedPrice: 1000 },
  })
  check(
    'a fixed price is pro-rated by the share of tracked time',
    near(prorata.earned, 200) && prorata.fixedBasis === 'prorata' && prorata.ms === 2 * HOUR && near(prorata.effectiveRate ?? 0, 100),
  )

  const fixedAll = projectFigures({
    ...base,
    periodMs: 10 * HOUR,
    allTimeMs: 10 * HOUR,
    allTimeEarned: 500,
    isAllTime: true,
    billing: { fixedPrice: 1000 },
  })
  check(
    'a fixed price replaces the hourly earnings in All time',
    fixedAll.earned === 1000 && fixedAll.fixedBasis === 'fixed' && fixedAll.effectiveRate === 100,
  )

  const manualAll = projectFigures({
    ...base,
    periodMs: 10 * HOUR,
    allTimeMs: 10 * HOUR,
    allTimeEarned: 500,
    isAllTime: true,
    billing: { manualHours: 20 },
  })
  check(
    'manual hours replace tracked hours, priced at the blended rate',
    manualAll.ms === 20 * HOUR && near(manualAll.earned, 1000) && manualAll.manualHours && manualAll.effectiveRate === 50,
  )

  const manualShort = projectFigures({
    ...base,
    periodMs: 2 * HOUR,
    periodEarned: 100,
    allTimeMs: 10 * HOUR,
    allTimeEarned: 500,
    isAllTime: false,
    billing: { manualHours: 20 },
  })
  check(
    'manual hours are ignored outside All time',
    manualShort.ms === 2 * HOUR && manualShort.earned === 100 && !manualShort.manualHours,
  )

  const untracked = projectFigures({
    ...base,
    periodMs: 0,
    allTimeMs: 0,
    isAllTime: false,
    billing: { fixedPrice: 1000 },
  })
  check(
    'a fixed price with no tracked time is not shown outside All time',
    untracked.earned === 0 && untracked.fixedBasis === null,
  )

  const noTime = projectFigures({
    ...base,
    periodMs: 0,
    allTimeMs: 0,
    isAllTime: true,
    billing: { manualHours: 5 },
  })
  check(
    'manual hours with nothing tracked use the project rate',
    near(noTime.earned, 250) && noTime.effectiveRate === 50,
  )
}

function verifyUpcomingTasks() {
  const FROM = '2026-10-19'
  const template = (id: string, overrides: Record<string, unknown>) =>
    ({
      id,
      title: id,
      priority: 'minor',
      order: 0,
      tagIds: [],
      isActive: true,
      createdAt: T0,
      updatedAt: T0,
      ...overrides,
    }) as unknown as TaskTemplate
  const row = (templateId: string, date: string, overrides: Record<string, unknown>) =>
    ({
      id: `${templateId}::${date}`,
      date,
      templateId,
      title: templateId,
      priority: 'minor',
      tagIds: [],
      status: 'todo',
      ...overrides,
    }) as unknown as DailyTask

  const oneOff = template('oneoff', { goalId: 'g1', startTime: '09:00', endTime: '10:00', recurrence: { type: 'none', startDate: '2026-10-22' } })
  const every8 = template('every8', { goalId: 'g1', recurrence: { type: 'daily', interval: 8, startDate: '2026-10-24' } })
  const daily = template('daily', { goalId: 'g2', recurrence: { type: 'daily', interval: 1, startDate: FROM } })
  const today = template('today', { goalId: 'g1', recurrence: { type: 'none', startDate: FROM } })
  const far = template('far', { goalId: 'g1', recurrence: { type: 'none', startDate: '2026-11-03' } })
  const edge = template('edge', { goalId: 'g1', recurrence: { type: 'none', startDate: '2026-11-02' } })
  const inactive = template('inactive', { goalId: 'g1', isActive: false, recurrence: { type: 'none', startDate: '2026-10-21' } })
  const done = row('oneoff', '2026-10-22', { goalId: 'g1', status: 'done', completedAt: T1 })
  const templates = [oneOff, every8, daily, today, far, edge, inactive]

  const all = collectUpcoming(templates, [done], FROM, 14, null)
  const items = all.flatMap((day) => day.items.map((item) => ({ ...item, date: day.date })))
  const byTemplate = (id: string) => items.filter((item) => item.templateId === id)

  section('Upcoming tasks')
  check('the window is sorted by date', same(all.map((day) => day.date), [...all.map((day) => day.date)].sort()))
  check('a one-off task on a future date is listed on that date', byTemplate('oneoff').length === 1 && byTemplate('oneoff')[0].date === '2026-10-22')
  check('a materialized row is not listed twice', byTemplate('oneoff').length === 1)
  check('a done row is listed as done', byTemplate('oneoff')[0]?.isDone === true)
  check('a one-off task has no repeat label', byTemplate('oneoff')[0]?.repeatLabel === undefined)
  check('the viewed date itself is left out', byTemplate('today').length === 0)
  check('a task 15 days out is left out', byTemplate('far').length === 0)
  check('a task on the last day of the window is kept', byTemplate('edge').length === 1)
  check('an inactive task is left out', byTemplate('inactive').length === 0)
  check('an every-8-days task shows once, at its start', byTemplate('every8').length === 1 && byTemplate('every8')[0].date === '2026-10-24')
  check('an every-8-days task carries its rule', byTemplate('every8')[0]?.repeatLabel === 'Every 8 days')
  check('a daily task shows once, at its first day in the window', byTemplate('daily').length === 1 && byTemplate('daily')[0].date === '2026-10-20')
  check('a daily task carries the Daily label', byTemplate('daily')[0]?.repeatLabel === 'Daily')

  const oneProject = collectUpcoming(templates, [done], FROM, 14, 'g2')
  const oneProjectItems = oneProject.flatMap((day) => day.items)
  check('a project filter keeps only that project', oneProjectItems.length === 1 && oneProjectItems[0].templateId === 'daily')

  check('weekly rules name their weekdays', describeRecurrence({ type: 'weekly', daysOfWeek: [1, 3], startDate: FROM }) === 'Weekly · Mon, Wed')
  check('a yearly rule reads as every year', describeRecurrence({ type: 'yearly', startDate: FROM }) === 'Every year')
}

function main() {
  verifyUpcomingTasks()
  verifyBoardFields()
  verifyProjectNotes()
  verifyProjectBilling()
  verifyRowsFromNewerBuild()
  verifyMergeKeepsUnknownFields()
  verifyRestoreKeepsUnknownFields()
  verifySettingsRow()
  verifyBackupFixture()
  verifyNewerBackup()
  verifyTaskNotes()

  console.log(`\n${checks - failures}/${checks} compat checks passed`)
  if (failures > 0) {
    console.log(`${failures} FAILED`)
    process.exitCode = 1
  }
}

main()
