/**
 * Forward compatibility: a row written by a newer build carries fields this
 * build does not know, and an older build must hand them back unchanged.
 *
 *     npm run verify:sync
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { diffRows, snapshotRows, stableStringify } from '../../src/sync/diff'
import { onlyGrewWithDefaults } from '../../src/composables/settingsSync'
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
import {
  crossedMidnight,
  formatAwayTime,
  isAwayLongEnough,
  isEndOfDay,
  isLongRunDue,
  plannedNudgeLabel,
  sittingRunningMs,
  sittingStartMs,
  splitStretchAroundAway,
} from '../../src/composables/timer/reminders'
import {
  blockLogState,
  localMs,
  loggableBlocks,
  pickPlannedStart,
  planBlockEntry,
  type PlannedBlock,
} from '../../src/composables/timer/plannedBlocks'
import {
  decideReminders,
  isEndOfDayMinutes,
  isLongRunDue as serverIsLongRunDue,
  isWithinQuietMinutes,
  loggableCount,
  pickPlannedStart as serverPickPlannedStart,
  PLANNED_START_GRACE_MS as SERVER_PLANNED_START_GRACE_MS,
  plannedNudgeLabel as serverPlannedNudgeLabel,
  sittingRunningMs as serverSittingRunningMs,
  type Clock,
  type ServerTask,
  type ServerTimer,
} from '../../../../supabase/functions/push-reminders/rules'
import { createIdleTimer, transition } from '../../src/composables/timer/machine'
import { DEFAULT_SETTINGS, isWithinQuietHours } from '../../src/composables/useSettings'
import {
  appStorageKeys,
  clearLocalAppData,
  isDeleteConfirmed,
} from '../../src/sync/accountDeletion'
import { parseBackupFile } from '../../src/features/settings/composables/backupFormat'
import type { Goal } from '../../src/entities/GoalEntity'
import { describeRecurrence } from '../../src/composables/goalSpace/recurrence'
import { collectUpcoming } from '../../src/features/tasks/composables/useUpcomingTasks'
import type { DailyTask, TaskTemplate } from '../../src/entities/TaskEntity'
import { BOARD_COLUMN, buildBoardCards, columnOf, planBoardMove, type BoardColumn } from '../../src/features/board/composables/boardModel'
import {
  parseBillingDraft,
  projectFigures,
  sameBilling,
  sanitizeBilling,
} from '../../src/features/analytics/composables/projectBilling'
import {
  budgetLevelOf,
  budgetStanding,
  budgetStandingOf,
  isLevelUp,
  parseBudgetDraft,
  sanitizeBudget,
} from '../../src/features/analytics/composables/projectBudget'
import {
  projectEarnings,
  totalEarned,
} from '../../src/features/analytics/composables/projectEarnings'
import {
  blockDurationMs,
  planBounds,
  plannedMsByProject,
  planVsActual,
} from '../../src/features/analytics/composables/planVsActual'
import {
  elapsedWorkingDays,
  incomeGoalStatus,
  sanitizeMonthlyIncome,
  workingDaysInMonth,
} from '../../src/features/analytics/composables/incomeGoal'
import { buildRateLookup } from '../../src/composables/timer/rates'
import {
  ANALYTICS_PERIOD,
  NO_PROJECT_KEY,
  type ProjectTotal,
} from '../../src/composables/timer/analytics'
import {
  RECURRENCE_TYPE,
  TIME_ENTRY_SOURCE,
  TIMER_MODE,
} from '../../src/entities/constants'
import { CLIENT_LIMITS, sanitizeClients, sanitizePayments } from '../../src/composables/billing/clients'
import {
  NO_CLIENT_FILTER_ID,
  OVERDUE_AFTER_DAYS,
  clientSummaries,
  isOverdue,
  outstandingSummary,
  withPaymentAmount,
  withPaymentStatus,
} from '../../src/features/analytics/composables/clientBilling'
import {
  CSV_BOM,
  buildCsv,
  buildReportLines,
  csvField,
  reportTotals,
} from '../../src/features/analytics/composables/billingExport'
import { buildPrintHtml } from '../../src/features/analytics/composables/printReport'
import { PAYMENT_STATUS, type Client, type PaymentRecord } from '../../src/entities/BillingEntity'
import type { TimeEntry } from '../../src/entities/TimerEntity'

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

function verifyBackupFixture() {
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

function verifyNewerBackup() {
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

  const cleared = { ...clone(task), boardClearedAt: T1 }
  check('boardClearedAt survives partitionLive', partitionLive(SYNC_TABLE.TASK_TEMPLATES, [clone(cleared)]).live[0].boardClearedAt === T1)
  check(
    'boardClearedAt is not lost when a newer edit comes from another device',
    mergeCollection(
      SYNC_TABLE.TASK_TEMPLATES,
      [{ ...clone(cleared), boardClearedAt: undefined, updatedAt: T0 }],
      [{ ...clone(cleared), updatedAt: T2 }],
    ).merged[0]?.boardClearedAt === T1,
  )
  check(
    'an undo that clears boardClearedAt beats the older value',
    mergeCollection(
      SYNC_TABLE.TASK_TEMPLATES,
      [{ ...clone(cleared), boardClearedAt: undefined, updatedAt: T2 }],
      [{ ...clone(cleared), updatedAt: T1 }],
    ).merged[0]?.boardClearedAt === undefined,
  )
  check('boardClearedAt survives restore from undo', restampForRestore(clone(cleared) as unknown as SyncedRow).boardClearedAt === T1)
  const clearedBackup = parseBackupFile({
    format: 'dayforge-backup',
    version: 1,
    goals: [clone(project)],
    taskTemplates: [clone(cleared)],
    dailyTasks: [],
  })
  check(
    'boardClearedAt survives a backup round trip',
    clearedBackup !== null && (clearedBackup.taskTemplates[0] as unknown as SyncedRow).boardClearedAt === T1,
  )
  check('a task never cleared has no boardClearedAt key', !('boardClearedAt' in task))

  const oneOff = task as unknown as TaskTemplate
  const repeating = { ...task, recurrence: { type: 'daily', startDate: '2026-09-01' } } as unknown as TaskTemplate
  const openOf = (cards: ReturnType<typeof buildBoardCards>) => [...cards.todo, ...cards.doing][0]
  const openCard = openOf(buildBoardCards([row], [oneOff], BOARD_DAY))
  const repeatingCard = openOf(buildBoardCards([row], [repeating], BOARD_DAY))
  check('a card exists for the open task', openCard !== undefined)
  check('moving an open one-off to done only toggles it', same(planBoardMove(openCard, BOARD_COLUMN.DONE), { toggleDone: true }))
  check('a repeating card on its own day can be finished', repeatingCard !== undefined && repeatingCard.canFinish && same(planBoardMove(repeatingCard, BOARD_COLUMN.DONE), { toggleDone: true }))
  const doneCard = buildBoardCards([{ ...row, status: 'done', completedAt: T1 }], [oneOff], BOARD_DAY).done[0]
  check('moving out of done un-completes it and sets the stage', same(planBoardMove(doneCard, BOARD_COLUMN.DOING), { toggleDone: true, stage: 'doing' }))
  check('moving back to to do clears the stage', same(planBoardMove(openCard, BOARD_COLUMN.TODO), { toggleDone: false, stage: null }))
}

// --- persistence across days -------------------------------------------------

const BOARD_DAY = '2026-09-10'
const BOARD_NEXT_DAY = '2026-09-11'

function weekdayOf(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).getDay()
}

function verifyBoardPersistence() {
  section('The board follows the project, not the day it is viewed')

  const template = (id: string, extra: Record<string, unknown> = {}) =>
    templateRow({ id, title: id, ...extra }) as unknown as TaskTemplate
  const rowOf = (templateId: string, date: string, extra: Record<string, unknown> = {}) =>
    dailyRow({ id: `${templateId}::${date}`, templateId, date, title: templateId, ...extra }) as unknown as DailyTask

  const open = template('task-open', { order: 1 })
  const oldDone = template('task-old-done', { order: 2 })
  const future = template('task-future', { order: 3, recurrence: { type: 'none', startDate: '2026-09-14' } })
  const daily = template('task-daily', { order: 4, recurrence: { type: 'daily', startDate: '2026-09-01' } })
  const habit = template('task-habit', { order: 5, recurrence: { type: 'daily', startDate: '2026-09-01' } })
  const weekly = template('task-weekly', { order: 6, recurrence: { type: 'weekly', startDate: '2026-09-01', daysOfWeek: [weekdayOf(BOARD_NEXT_DAY)] } })
  const undated = template('task-undated', { order: 7, recurrence: { type: 'weekly', startDate: '2026-09-01', daysOfWeek: [] } })
  const proj = template('task-proj', { order: 8 })
  const child = template('task-child', { order: 9, parentTemplateId: 'task-proj' })
  const inactive = template('task-gone', { order: 10, isActive: false })
  const templates = [open, oldDone, future, daily, habit, weekly, undated, proj, child, inactive]

  const rows = [
    rowOf('task-open', BOARD_DAY),
    rowOf('task-old-done', '2026-09-08', { status: 'done', completedAt: '2026-09-08T12:00:00.000Z' }),
    rowOf('task-future', '2026-09-14'),
    rowOf('task-daily', BOARD_DAY),
    rowOf('task-habit', BOARD_DAY, { status: 'done', completedAt: `${BOARD_DAY}T08:00:00.000Z` }),
    rowOf('task-proj', BOARD_DAY),
    rowOf('task-child', BOARD_DAY, { parentDailyTaskId: `task-proj::${BOARD_DAY}` }),
    rowOf('task-gone', BOARD_DAY),
  ]

  const cards = buildBoardCards(rows, templates, BOARD_DAY)
  const ids = (column: BoardColumn) => cards[column].map((card) => card.id)
  const cardOf = (id: string) => [...cards.todo, ...cards.doing, ...cards.done].find((card) => card.id === id)

  check('an open task shows in To do, dated today', ids('todo').includes('task-open') && cardOf('task-open')?.date === BOARD_DAY)
  check('an earlier day\'s finished one-off stays in Done', ids('done').includes('task-old-done'))
  check('a task scheduled ahead shows with its date', cardOf('task-future')?.date === '2026-09-14' && ids('todo').includes('task-future'))
  check('a repeating task shows once, for today', ids('todo').filter((id) => id === 'task-daily').length === 1 && cardOf('task-daily')?.canFinish === true)
  check('a repeating task done today is in Done', ids('done').includes('task-habit'))
  check('a repeating task not due today shows its next date and cannot be finished', cardOf('task-weekly')?.date === BOARD_NEXT_DAY && cardOf('task-weekly')?.canFinish === false)
  check('a subtask is counted on its project card, not shown on its own', !cardOf('task-child') && cardOf('task-proj')?.subtasksTotal === 1 && cardOf('task-proj')?.subtasksDone === 0)
  check('the project card carries its subtask ids for the timer rollup', same(cardOf('task-proj')?.childTemplateIds, ['task-child']))
  check('an inactive task is left off the board', !cardOf('task-gone'))

  const todoOrder = ids('todo')
  check(
    'To do lists overdue or today first, upcoming next, undated last',
    todoOrder.indexOf('task-open') < todoOrder.indexOf('task-future') &&
      todoOrder.indexOf('task-future') < todoOrder.indexOf('task-undated') &&
      todoOrder[todoOrder.length - 1] === 'task-undated',
    todoOrder,
  )

  const nextDay = buildBoardCards(rows, templates, BOARD_NEXT_DAY)
  check('a finished one-off is still in Done the next day', nextDay.done.some((card) => card.id === 'task-old-done'))
  check('an open task is still on the board the next day', nextDay.todo.some((card) => card.id === 'task-open'))
  check('a habit done today is back in To do tomorrow', nextDay.todo.some((card) => card.id === 'task-habit') && !nextDay.done.some((card) => card.id === 'task-habit'))

  const clearedAt = `${BOARD_DAY}T09:00:00.000Z`
  const clearedTemplates = templates.map((item) =>
    item.id === 'task-old-done' || item.id === 'task-habit' ? { ...item, boardClearedAt: clearedAt } : item,
  ) as TaskTemplate[]
  const afterClear = buildBoardCards(rows, clearedTemplates, BOARD_DAY)
  check('clear done hides a cleared one-off and a cleared habit from Done', afterClear.done.length === 0)
  check('clear done leaves open cards alone', afterClear.todo.some((card) => card.id === 'task-open'))
  check('clearing does not remove the rows', rows.length === 8)

  const recompleted = buildBoardCards(
    [...rows.filter((row) => row.templateId !== 'task-habit'), rowOf('task-habit', BOARD_DAY, { status: 'done', completedAt: `${BOARD_DAY}T10:30:00.000Z` })],
    clearedTemplates,
    BOARD_DAY,
  )
  check('a card un-finished and finished again after clearing comes back', recompleted.done.some((card) => card.id === 'task-habit'))

  const twoDone = buildBoardCards(
    [rowOf('task-old-done', '2026-09-08', { status: 'done', completedAt: '2026-09-08T12:00:00.000Z' }), rowOf('task-habit', BOARD_DAY, { status: 'done', completedAt: `${BOARD_DAY}T08:00:00.000Z` })],
    [oldDone, habit],
    BOARD_DAY,
  )
  check('Done sorts by completion, newest first', twoDone.done.map((card) => card.id).join(',') === 'task-habit,task-old-done')

  const moveOnFuture = buildBoardCards(rows, templates, BOARD_DAY).todo.find((card) => card.id === 'task-weekly')
  check('a repeating task not due today cannot be moved to Done', moveOnFuture !== undefined && same(planBoardMove(moveOnFuture, BOARD_COLUMN.DONE), { toggleDone: false }))
  check('a repeating task not due today can still change column', moveOnFuture !== undefined && same(planBoardMove(moveOnFuture, BOARD_COLUMN.DOING), { toggleDone: false, stage: 'doing' }))
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

function verifyAccountDeletionWipe() {
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

const MIN = 60 * 1000
const HOUR = 60 * MIN

function localAt(year: number, month: number, day: number, hours: number, minutes: number): number {
  return new Date(year, month - 1, day, hours, minutes).getTime()
}

function entryAt(sessionId: string, startedAt: number, endedAt: number, taskId?: string): TimeEntry {
  return {
    id: `entry-${sessionId}-${startedAt}`,
    sessionId,
    startedAt: new Date(startedAt).toISOString(),
    endedAt: new Date(endedAt).toISOString(),
    mode: TIMER_MODE.STOPWATCH,
    taskId,
    source: 'timer',
    updatedAt: T0,
  } as TimeEntry
}

function blockTask(id: string, date: string, startTime: string | undefined, endTime: string | undefined, status = 'todo'): DailyTask {
  return {
    id: `${id}::${date}`,
    date,
    templateId: id,
    title: `Block ${id}`,
    priority: 'minor',
    tagIds: [],
    status,
    startTime,
    endTime,
  } as DailyTask
}

function verifyTimerReminders() {
  section('Timer reminders: long runs, away time, planned blocks')

  check('a long run is not due before its threshold', !isLongRunDue(3 * HOUR - 1, 3))
  check('a long run is due exactly at its threshold', isLongRunDue(3 * HOUR, 3))
  check('a long run never fires when switched off', !isLongRunDue(9 * HOUR, 0))

  const sitting = 'sit-a'
  const entries = [
    entryAt(sitting, localAt(2026, 10, 21, 8, 0), localAt(2026, 10, 21, 9, 0)),
    entryAt(sitting, localAt(2026, 10, 21, 9, 30), localAt(2026, 10, 21, 10, 0)),
    entryAt('sit-b', localAt(2026, 10, 21, 6, 0), localAt(2026, 10, 21, 11, 0)),
  ]
  check(
    'a sitting counts its recorded stretches and the running one, not other sittings',
    sittingRunningMs(entries, sitting, 10 * MIN) === 100 * MIN,
  )
  check(
    'a sitting is dated from its earliest recorded stretch',
    sittingStartMs(entries, sitting, localAt(2026, 10, 21, 10, 5)) === localAt(2026, 10, 21, 8, 0),
  )
  check(
    'a run that began the day before has crossed midnight',
    crossedMidnight(localAt(2026, 10, 24, 23, 50), localAt(2026, 10, 25, 0, 10)),
  )
  check(
    'a run that began and is still going the same day has not',
    !crossedMidnight(localAt(2026, 10, 24, 8, 0), localAt(2026, 10, 24, 23, 59)),
  )

  check('an away spell shorter than the threshold is ignored', !isAwayLongEnough(15 * MIN - 1, 15))
  check('an away spell at the threshold asks', isAwayLongEnough(15 * MIN, 15))
  check('away prompts never fire when switched off', !isAwayLongEnough(5 * HOUR, 0))

  const split = splitStretchAroundAway(0, 40 * MIN, 100 * MIN)
  check('only the time before the tab was hidden is kept', split.keptEndsAt === 40 * MIN)
  check('the timer resumes at the moment of return', split.resumeAt === 100 * MIN)
  check(
    'a stretch that started during the away spell keeps nothing',
    splitStretchAroundAway(50 * MIN, 40 * MIN, 100 * MIN).keptEndsAt === null,
  )

  const settings = DEFAULT_SETTINGS.timer
  const timer = transition(createIdleTimer(), { type: 'start', sessionId: 'trim', mode: TIMER_MODE.STOPWATCH }, 0, settings).timer
  const pausedAway = transition(timer, { type: 'pause' }, 40 * MIN, settings)
  const resumed = transition(pausedAway.timer, { type: 'resume' }, 100 * MIN, settings)
  const stopped = transition(resumed.timer, { type: 'stop' }, 130 * MIN, settings)
  const trimmed = [...pausedAway.entries, ...stopped.entries].reduce(
    (total, draft) => total + (draft.endedAt - draft.startedAt),
    0,
  )
  check('discarding the away time leaves only the minutes that were actually worked', trimmed === 70 * MIN, trimmed / MIN)

  check('away time reads as an hour and minutes', formatAwayTime(80 * MIN) === '1 h 20 min')
  check('away time under an hour reads in minutes', formatAwayTime(45 * MIN) === '45 min')
  check('away time on the hour drops the minutes', formatAwayTime(60 * MIN) === '1 h')
  check('very short away time has its own wording', formatAwayTime(10 * 1000) === 'less than a minute')

  check('the evening nudge waits for its set time', !isEndOfDay(new Date(2026, 9, 21, 17, 59), '18:00') && isEndOfDay(new Date(2026, 9, 21, 18, 0), '18:00'))
  check('the evening nudge defaults to 22:00', DEFAULT_SETTINGS.notifications.endOfDayTime === '22:00')
  check('the default evening nudge stays quiet before 22:00', !isEndOfDay(new Date(2026, 9, 21, 21, 59), DEFAULT_SETTINGS.notifications.endOfDayTime) && isEndOfDay(new Date(2026, 9, 21, 22, 0), DEFAULT_SETTINGS.notifications.endOfDayTime))
  check('a later evening nudge time is honoured', !isEndOfDay(new Date(2026, 9, 21, 19, 0), '23:30') && isEndOfDay(new Date(2026, 9, 21, 23, 30), '23:30'))
  check('the nudge counts its blocks in words', plannedNudgeLabel(1).startsWith('1 planned block') && plannedNudgeLabel(3).startsWith('3 planned blocks'))

  const now = localAt(2026, 10, 21, 10, 0)
  const blocks = {
    past: { templateId: 'past', title: 'Past', date: '2026-10-20', startTime: '09:00', endTime: '10:00' },
    endsNow: { templateId: 'endsNow', title: 'Ends now', date: '2026-10-21', startTime: '09:00', endTime: '10:00' },
    later: { templateId: 'later', title: 'Later', date: '2026-10-21', startTime: '10:30', endTime: '11:00' },
    noEnd: { templateId: 'noEnd', title: 'No end', date: '2026-10-20', startTime: '13:00' },
    overlapped: { templateId: 'overlapped', title: 'Overlapped', date: '2026-10-20', startTime: '14:00', endTime: '15:00' },
    touching: { templateId: 'touching', title: 'Touching', date: '2026-10-20', startTime: '16:00', endTime: '17:00' },
  }
  const logged = [
    entryAt('x', localAt(2026, 10, 20, 14, 30), localAt(2026, 10, 20, 15, 30), 'other'),
    entryAt('y', localAt(2026, 10, 20, 15, 0), localAt(2026, 10, 20, 16, 0)),
  ]
  check('a finished block with nothing over it is loggable', blockLogState(blocks.past, [], now) === 'loggable')
  check('a block that ends right now is loggable', blockLogState(blocks.endsNow, [], now) === 'loggable')
  check('a block that has not ended yet is not loggable', blockLogState(blocks.later, [], now) === 'not-finished')
  check('a block without an end time is not loggable', blockLogState(blocks.noEnd, [], now) === 'no-end')
  check('a block with time already over it is not loggable', blockLogState(blocks.overlapped, logged, now) === 'logged')
  check('an entry that only touches a block does not block it', blockLogState(blocks.touching, [logged[1]], now) === 'loggable')
  check('any overlapping entry counts, whatever task it belongs to', blockLogState(blocks.overlapped, [logged[0]], now) === 'logged')

  const loggable = loggableBlocks(Object.values(blocks) as PlannedBlock[], logged, now).map((block) => block.templateId)
  check('the blocks that qualify are the finished, unlogged ones', same(loggable, ['past', 'endsNow', 'touching']), loggable)

  const planned = planBlockEntry(blocks.past as PlannedBlock, [], now)
  check(
    'a planned block is logged exactly to its times, against its task',
    planned.ok &&
      planned.payload.startedAt === new Date(localAt(2026, 10, 20, 9, 0)).toISOString() &&
      planned.payload.endedAt === new Date(localAt(2026, 10, 20, 10, 0)).toISOString() &&
      planned.payload.taskId === 'past',
  )
  check('an overlapping block is refused, not written over', !planBlockEntry(blocks.overlapped as PlannedBlock, logged, now).ok)
  check('a block that has not ended is refused', !planBlockEntry(blocks.later as PlannedBlock, [], now).ok)

  const tasks = [
    blockTask('t1', '2026-10-21', '09:00', '10:00'),
    blockTask('t2', '2026-10-21', '09:30', '10:30'),
    blockTask('done', '2026-10-21', '09:10', '09:40', 'done'),
    blockTask('later', '2026-10-21', '10:30', '11:00'),
  ]
  const today = '2026-10-21'
  const none = (): boolean => false
  check(
    'a block started less than five minutes ago is not prompted',
    pickPlannedStart(tasks, today, localAt(2026, 10, 21, 9, 4), [], none) === null,
  )
  check(
    'a due block is prompted once five minutes have passed',
    pickPlannedStart(tasks, today, localAt(2026, 10, 21, 9, 5), [], none)?.templateId === 't1',
  )
  check(
    'the most recently started due block is the one prompted',
    pickPlannedStart(tasks, today, localAt(2026, 10, 21, 10, 0), [], none)?.templateId === 't2',
  )
  check(
    'a done block is never prompted',
    pickPlannedStart(tasks.filter((task) => task.templateId !== 't2'), today, localAt(2026, 10, 21, 9, 45), [], (task) => task.templateId === 't1') === null,
  )
  check(
    'a dismissed block is skipped',
    pickPlannedStart(tasks, today, localAt(2026, 10, 21, 9, 20), [], (task) => task.templateId === 't1') === null,
  )
  check(
    'a block already tracked since it began is not prompted',
    pickPlannedStart(tasks, today, localAt(2026, 10, 21, 9, 20), [entryAt('q', localAt(2026, 10, 21, 9, 6), localAt(2026, 10, 21, 9, 15), 't1')], none) === null,
  )
}

/** Budget, plan vs actual and the monthly income goal: sync, backup and the math. */
function verifyBudgetPlanIncome() {
  section('Project budget, plan vs actual and monthly income goal')

  const HOUR = 60 * 60 * 1000
  const MIN = 60 * 1000
  const near = (left: number, right: number) => Math.abs(left - right) < 1e-9

  const budgeted = goalRow({
    id: 'goal-f',
    budget: { hours: 20, amount: 1500, period: 'month' },
    updatedAt: T1,
  })
  const unbudgeted = goalRow({ id: 'goal-f', updatedAt: T0 })

  check(
    'a budget survives a whole-row merge in either direction',
    same(mergeRow(SYNC_TABLE.GOALS, unbudgeted, budgeted).row.budget, budgeted.budget) &&
      same(mergeRow(SYNC_TABLE.GOALS, budgeted, unbudgeted).row.budget, budgeted.budget),
  )

  const budgetBackup = parseBackupFile({
    format: 'dayforge-backup',
    version: 1,
    goals: [clone(budgeted)],
    taskTemplates: [],
    dailyTasks: [],
  })
  check(
    'a budget survives a backup round trip',
    budgetBackup !== null && same(budgetBackup.goals[0].budget, budgeted.budget),
  )

  check(
    'the income goal is a synced settings section',
    (SYNCED_SECTIONS as readonly string[]).includes('goals') &&
      DEFAULT_SETTINGS.goals.monthlyIncome === undefined &&
      'monthlyIncome' in DEFAULT_SETTINGS.goals,
  )
  const settingsRemote: Record<string, unknown> = {
    id: 'settings',
    updatedAt: T1,
    ...clone(DEFAULT_SETTINGS),
    goals: { monthlyIncome: 3000 },
  }
  check(
    'a monthly income goal from another device is read as a known section',
    !('goals' in heldFromRow(settingsRemote, SYNCED_SECTIONS, DEFAULT_SETTINGS)),
  )

  check(
    'a budget keeps valid limits and its period',
    same(sanitizeBudget({ hours: 20, amount: 1500, period: 'month' }), { hours: 20, amount: 1500, period: 'month' }),
  )
  check(
    'a budget drops limits out of range',
    sanitizeBudget({ hours: -1, amount: 1e9, period: 'month' }) === undefined,
  )
  check(
    'a budget with one limit left keeps just that limit',
    same(sanitizeBudget({ hours: 5, amount: 0, period: 'month' }), { hours: 5, period: 'month' }),
  )
  check(
    'a budget with no limit is no budget, and an unknown period is the whole project',
    sanitizeBudget({ period: 'total' }) === undefined &&
      sanitizeBudget('x') === undefined &&
      sanitizeBudget({ hours: 5, period: 'year' })?.period === 'total',
  )

  const emptyBudget = parseBudgetDraft({ hours: '', amount: ' ', period: 'total' })
  check('an empty budget draft means no budget', emptyBudget.ok && emptyBudget.budget === undefined)
  const commaBudget = parseBudgetDraft({ hours: '12,5', amount: '', period: 'month' })
  check('a comma decimal is read as a point in a budget', commaBudget.ok && commaBudget.budget?.hours === 12.5)
  check(
    'a zero or negative budget limit is refused',
    !parseBudgetDraft({ hours: '0', amount: '', period: 'total' }).ok &&
      !parseBudgetDraft({ hours: '', amount: '-3', period: 'total' }).ok,
  )

  check(
    'the warning lines sit at 80% and 100%',
    budgetLevelOf(0.79) === 'ok' && budgetLevelOf(0.8) === 'warn' && budgetLevelOf(0.99) === 'warn' && budgetLevelOf(1) === 'over',
  )

  const hoursOnly = budgetStanding({ hours: 20, period: 'total' }, { trackedMs: 16 * HOUR, earned: 0 })
  check(
    'hours progress is tracked time over the limit',
    near(hoursOnly.fraction, 0.8) && hoursOnly.level === 'warn' && hoursOnly.amountFraction === null,
  )
  const bothLimits = budgetStanding(
    { hours: 20, amount: 1000, period: 'total' },
    { trackedMs: 5 * HOUR, earned: 900 },
  )
  check(
    'with both limits the larger fraction decides',
    near(bothLimits.fraction, 0.9) && bothLimits.level === 'warn' && near(bothLimits.hoursFraction ?? 0, 0.25),
  )
  const moneyOver = budgetStanding({ amount: 1000, period: 'total' }, { trackedMs: 0, earned: 1100 })
  check('earnings past the money limit are over budget', near(moneyOver.fraction, 1.1) && moneyOver.level === 'over')

  check(
    'a notice fires only when the level goes up',
    isLevelUp(undefined, 'warn') &&
      isLevelUp('warn', 'over') &&
      !isLevelUp('warn', 'warn') &&
      !isLevelUp('over', 'warn') &&
      !isLevelUp(undefined, 'ok'),
  )

  // Oct 25 2026: the monthly scope counts only October's time.
  const now = new Date(2026, 9, 25, 12)
  const entryOn = (id: string, when: Date, hours: number): TimeEntry => ({
    id,
    sessionId: `session-${id}`,
    startedAt: new Date(when.getTime()).toISOString(),
    endedAt: new Date(when.getTime() + hours * HOUR).toISOString(),
    mode: TIMER_MODE.STOPWATCH,
    goalId: 'goal-b',
    source: TIME_ENTRY_SOURCE.TIMER,
    updatedAt: T1,
  })
  const lastMonthEntry = entryOn('sep', new Date(2026, 8, 20, 9), 8)
  const thisMonthEntry = entryOn('oct', new Date(2026, 9, 10, 9), 2)
  const goalB = goalRow({ id: 'goal-b', title: 'Brand', budget: { hours: 5, period: 'month' } }) as unknown as Goal
  const context = {
    allEntries: [lastMonthEntry, thisMonthEntry],
    goals: [goalB],
    lookup: buildRateLookup([], [goalB], 50),
    now,
  }

  const monthly = budgetStandingOf(goalB, context)
  check('a monthly budget counts only this month', monthly !== null && near(monthly.fraction, 0.4) && monthly.level === 'ok')
  const total = budgetStandingOf({ ...goalB, budget: { hours: 5, period: 'total' } }, context)
  check('a total budget counts everything tracked', total !== null && near(total.fraction, 2) && total.level === 'over')
  check('no budget means no standing', budgetStandingOf({ ...goalB, budget: undefined }, context) === null)

  const priced = { ...goalB, budget: undefined, billing: { fixedPrice: 1000 } } as Goal
  const pricedMonth = projectEarnings({
    allEntries: [lastMonthEntry, thisMonthEntry],
    periodEntries: [thisMonthEntry],
    goals: [priced],
    lookup: buildRateLookup([], [priced], 50),
    isAllTime: false,
  })
  check('month earnings pro-rate a fixed price by the tracked share', near(totalEarned(pricedMonth), 200))

  check('a 45-minute block counts its real length', blockDurationMs('09:00', '09:45', 60) === 45 * MIN)
  check('a block with only a start uses the calendar default', blockDurationMs('12:00', undefined, 60) === 60 * MIN)
  check('a block without a start is not on the grid', blockDurationMs(undefined, '10:00', 60) === 0)
  check('a block that ends before it starts counts for nothing', blockDurationMs('10:00', '09:00', 60) === 0)

  const tpl = (id: string, overrides: Record<string, unknown>) =>
    ({ id, title: id, priority: 'minor', order: 0, tagIds: [], isActive: true, createdAt: T0, updatedAt: T0, ...overrides }) as TaskTemplate
  const standup = tpl('standup', {
    goalId: 'goal-a',
    startTime: '09:00',
    endTime: '10:30',
    recurrence: { type: RECURRENCE_TYPE.DAILY, startDate: '2026-10-01' },
  })
  const review = tpl('review', {
    goalId: 'goal-a',
    startTime: '10:00',
    endTime: '11:00',
    recurrence: { type: RECURRENCE_TYPE.WEEKLY, daysOfWeek: [1, 3], startDate: '2026-10-01' },
  })
  const errand = tpl('errand', {
    startTime: '12:00',
    recurrence: { type: RECURRENCE_TYPE.NONE, startDate: '2026-10-20' },
  })
  const retired = tpl('retired', {
    goalId: 'goal-a',
    startTime: '08:00',
    endTime: '11:00',
    isActive: false,
    recurrence: { type: RECURRENCE_TYPE.DAILY, startDate: '2026-10-01' },
  })
  // A day row replaces the repeat's projection on its date: 14 Oct is a Wednesday.
  const movedReview = {
    id: 'review::2026-10-14',
    date: '2026-10-14',
    goalId: 'goal-a',
    templateId: 'review',
    title: 'review',
    priority: 'minor',
    tagIds: [],
    status: 'todo',
    startTime: '14:00',
    endTime: '15:30',
  } as DailyTask

  const plan = plannedMsByProject(
    { templates: [standup, review, errand, retired], dailyTasks: [movedReview], defaultDurationMinutes: 60 },
    '2026-10-01',
    '2026-10-31',
  )
  // Standup: 31 days x 90 min. Review: 8 Mon/Wed x 60 min, with 14 Oct at 90 min from its row.
  check('planned time adds repeats and day rows without counting a day twice', plan.get('goal-a') === (31 * 90 + 7 * 60 + 90) * MIN)
  check('a one-off block with no end uses the default length, no project', plan.get(NO_PROJECT_KEY) === 60 * MIN)
  check('an inactive task is not planned', plan.get('goal-a') === 3300 * MIN)
  check('a range that stops early counts only its days', plannedMsByProject(
    { templates: [standup], dailyTasks: [], defaultDurationMinutes: 60 },
    '2026-10-01',
    '2026-10-07',
  ).get('goal-a') === 7 * 90 * MIN)

  check('this month plans the whole month', same(planBounds(ANALYTICS_PERIOD.THIS_MONTH, '2026-10-25', null), { from: '2026-10-01', to: '2026-10-31' }))
  check('last month plans the whole previous month', same(planBounds(ANALYTICS_PERIOD.LAST_MONTH, '2026-10-25', null), { from: '2026-09-01', to: '2026-09-30' }))
  check('this week runs Monday to Sunday', same(planBounds(ANALYTICS_PERIOD.THIS_WEEK, '2026-10-25', null), { from: '2026-10-19', to: '2026-10-25' }))
  check('all time runs from the first day to today', same(planBounds(ANALYTICS_PERIOD.ALL, '2026-10-25', '2026-08-03'), { from: '2026-08-03', to: '2026-10-25' }))
  check('all time with nothing recorded is today alone', same(planBounds(ANALYTICS_PERIOD.ALL, '2026-10-25', null), { from: '2026-10-25', to: '2026-10-25' }))

  const goalA = goalRow({ id: 'goal-a', title: 'Work' }) as unknown as Goal
  const underPlan = planVsActual(
    new Map([['goal-a', 3300 * MIN]]),
    [{ goalId: 'goal-a', title: 'Work', totalMs: 3000 * MIN, taskCount: 2 }],
    [goalA],
  )
  const rowA = underPlan.rows.find((row) => row.key === 'goal-a')
  check(
    'a project under its plan shows the shortfall and its share',
    rowA !== undefined && rowA.diffMs === -300 * MIN && rowA.state === 'under' && near(rowA.percent ?? 0, (-300 / 3300) * 100),
  )

  const withUnplanned = planVsActual(
    new Map([['goal-a', 3300 * MIN]]),
    [
      { goalId: 'goal-a', title: 'Work', totalMs: 3300 * MIN, taskCount: 2 },
      { title: 'Without a project', totalMs: 30 * MIN, taskCount: 1 },
    ],
    [goalA],
  )
  check('a project exactly on plan reads as on plan', withUnplanned.rows.find((row) => row.key === 'goal-a')?.state === 'on')
  const stray = withUnplanned.rows.find((row) => row.key === NO_PROJECT_KEY)
  check('time on a project with no plan is unplanned, with no percent', stray?.state === 'unplanned' && stray.percent === null)
  check(
    'the overall line sums both and reads over plan',
    withUnplanned.total.plannedMs === 3300 * MIN && withUnplanned.total.actualMs === 3330 * MIN && withUnplanned.total.state === 'over',
  )

  check('working days in October 2026 are Monday to Friday', workingDaysInMonth(now) === 22)
  check('17 working days have passed by 25 October', elapsedWorkingDays(now) === 17)

  const behind = incomeGoalStatus(3000, 1700, now)
  check(
    'the pace projects earnings across the working days',
    behind !== null && near(behind.forecast ?? 0, 2200) && behind.state === 'behind' && near(behind.behindBy, 800),
  )
  check('a pace that reaches the goal is on track', incomeGoalStatus(3000, 2500, now)?.state === 'on-track')
  check('earnings past the goal say so', incomeGoalStatus(3000, 3100, now)?.state === 'reached')
  check('no goal means no status', incomeGoalStatus(undefined, 100, now) === null)
  check('before the first working day there is no pace yet', incomeGoalStatus(3000, 0, new Date(2026, 10, 1, 12))?.state === 'pending')
  check(
    'a monthly goal is kept only when it is a positive, finite amount',
    sanitizeMonthlyIncome(3000) === 3000 &&
      sanitizeMonthlyIncome(0) === undefined &&
      sanitizeMonthlyIncome(-5) === undefined &&
      sanitizeMonthlyIncome('3000') === undefined &&
      sanitizeMonthlyIncome(Number.NaN) === undefined &&
      sanitizeMonthlyIncome(10_000_001) === undefined,
  )
}

function timeEntry(
  id: string,
  goalId: string | undefined,
  startIso: string,
  minutes: number,
  taskTitle?: string,
): TimeEntry {
  const start = Date.parse(startIso)
  return {
    id,
    sessionId: `session-${id}`,
    startedAt: startIso,
    endedAt: new Date(start + minutes * 60 * 1000).toISOString(),
    mode: 'stopwatch',
    source: 'timer',
    goalId,
    taskTitle,
    updatedAt: startIso,
  } as unknown as TimeEntry
}

function verifyClientsAndBilling() {
  section('Clients, payment status and the report export')

  const clients = sanitizeClients([
    { id: 'c1', name: '  Acme  ', email: ' a@acme.test ', notes: '', archived: true, extra: 1 },
    { id: 'c1', name: 'Duplicate id' },
    { id: 'c2', name: '   ' },
    { id: '', name: 'No id' },
    'junk',
    { id: 'c3', name: 'x'.repeat(200) },
  ])
  check('clients: duplicate ids, blank names and junk are dropped', clients.length === 2)
  check(
    'clients: names and emails are trimmed, blanks removed, unknown fields kept',
    same(clients[0], { id: 'c1', name: 'Acme', email: 'a@acme.test', archived: true, extra: 1 }),
    clients[0],
  )
  check(
    'clients: long names are capped',
    clients[1].name.length === CLIENT_LIMITS.NAME_MAX,
  )

  const payments = sanitizePayments([
    { clientId: 'c1', month: '2026-09', status: 'invoiced', amount: 1200, invoicedAt: T0 },
    { clientId: 'c1', month: '2026-09', status: 'paid' },
    { clientId: 'c2', month: '2026-13', status: 'paid' },
    { clientId: 'c2', month: '2026-08', status: 'unbilled' },
    { clientId: 'c3', month: '2026-08', status: 'paid', amount: -5, paidAt: 'soon' },
  ])
  check('payments: one record per client and month, bad months and unbilled rows dropped', payments.length === 2, payments)
  check('payments: the record gets its key', payments[0].key === 'c1:2026-09')
  check(
    'payments: a bad amount or date is removed, not kept',
    payments[1].amount === undefined && payments[1].paidAt === undefined,
    payments[1],
  )

  check(
    'csv: plain text is not quoted',
    csvField('plain') === 'plain' && csvField(3.5) === '3.5',
  )
  check(
    'csv: commas, quotes, line breaks and semicolons are quoted',
    csvField('a,b') === '"a,b"' &&
      csvField('say "hi"') === '"say ""hi"""' &&
      csvField('line\nbreak') === '"line\nbreak"' &&
      csvField('x;y') === '"x;y"',
  )
  check('csv: spaces at the ends are quoted', csvField(' pad ') === '" pad "')
  check(
    'csv: text starting with a formula character is neutralised',
    csvField('=SUM(A1)', true) === "'=SUM(A1)" && csvField('-3', false) === '-3',
  )

  const goals = [
    { id: 'g1', title: 'Site, redesign', status: 'active', createdAt: T0, updatedAt: T0, clientId: 'c1' },
    { id: 'g2', title: 'Logo', status: 'active', createdAt: T0, updatedAt: T0 },
  ] as unknown as Goal[]
  const reportClients: Client[] = [{ id: 'c1', name: 'Acme; Ltd' }]
  const entries = [
    timeEntry('e1', 'g1', '2026-09-02T10:00:00.000Z', 120, 'Layout "v2"'),
    timeEntry('e2', 'g2', '2026-09-02T13:00:00.000Z', 30, 'Sketches'),
    timeEntry('e3', undefined, '2026-09-02T09:00:00.000Z', 15),
  ]
  const lines = buildReportLines({
    entries,
    goals,
    clients: reportClients,
    rateOf: (_taskId, goalId) => (goalId === 'g1' ? 50 : 0),
  })

  check('report: lines are in time order', lines.map((line) => line.taskTitle).join('|') === '|Layout "v2"|Sketches', lines)
  const totals = reportTotals(lines)
  check('report: totals add up the duration and amount', Math.abs(totals.ms - 165 * 60 * 1000) < 1 && Math.abs(totals.amount - 100) < 1e-9, totals)

  const csv = buildCsv(lines, 'USD')
  const rows = csv.slice(1).split('\r\n').filter((row) => row !== '')
  check('csv: starts with a UTF-8 byte order mark', csv.charCodeAt(0) === 0xfeff && csv.startsWith(CSV_BOM))
  check(
    'csv: header names the columns and the currency',
    rows[0] === 'Date,Start,End,Duration (h),Client,Project,Task,Rate (USD),Amount (USD)',
    rows[0],
  )
  check(
    'csv: a row keeps quoted client, project and task text',
    rows[2].includes('"Acme; Ltd"') && rows[2].includes('"Site, redesign"') && rows[2].includes('"Layout ""v2"""'),
    rows[2],
  )
  check('csv: duration is decimal hours and amount is rounded', rows[2].includes(',2.00,') && rows[2].endsWith(',50.00,100.00'), rows[2])
  check(
    'csv: the last row is the totals',
    rows[rows.length - 1] === 'Total,,,2.75,,,,,100.00',
    rows[rows.length - 1],
  )
  check('csv: entries without a project say so', rows[1].includes('Without a project') && rows[1].includes('No client'), rows[1])

  const lookup = buildRateLookup([], goals, 40)
  const billed = [...goals]
  billed[0] = { ...billed[0], billing: { fixedPrice: 1000 } } as Goal
  const summaries = clientSummaries({
    periodEntries: [timeEntry('p1', 'g1', '2026-09-02T10:00:00.000Z', 120), timeEntry('p2', 'g2', '2026-09-02T13:00:00.000Z', 60)],
    allEntries: [timeEntry('p1', 'g1', '2026-09-02T10:00:00.000Z', 120), timeEntry('p2', 'g2', '2026-09-02T13:00:00.000Z', 60)],
    goals: billed,
    clients: reportClients,
    lookup,
    isAllTime: true,
  })
  check(
    'by client: a fixed price replaces the hourly earnings of its projects',
    summaries[0].clientId === 'c1' && summaries[0].earned === 1000 && summaries[0].hasFixedPrice && summaries[0].ms === 2 * 60 * 60 * 1000,
    summaries,
  )
  check(
    'by client: projects without a client are one row at their own rate',
    summaries[1].key === NO_CLIENT_FILTER_ID && Math.abs(summaries[1].earned - 40) < 1e-9,
    summaries[1],
  )

  const T_NOW = Date.parse('2026-10-25T12:00:00.000Z')
  const DAY = 24 * 60 * 60 * 1000
  const started = withPaymentStatus([], 'c1', '2026-09', PAYMENT_STATUS.INVOICED, T0, 1200)
  check(
    'payments: invoicing stores the amount and the date, not a paid date',
    started.length === 1 && started[0].amount === 1200 && started[0].invoicedAt === T0 && started[0].paidAt === undefined,
    started,
  )
  const paid = withPaymentStatus(started, 'c1', '2026-09', PAYMENT_STATUS.PAID, T1)
  check(
    'payments: paying keeps the invoice date and stamps the paid date',
    paid.length === 1 && paid[0].invoicedAt === T0 && paid[0].paidAt === T1 && paid[0].amount === 1200,
    paid,
  )
  const reopened = withPaymentStatus(paid, 'c1', '2026-09', PAYMENT_STATUS.INVOICED, T2)
  check('payments: moving back to invoiced clears the paid date', reopened[0].paidAt === undefined && reopened[0].invoicedAt === T0)
  check('payments: unbilled removes the record', withPaymentStatus(paid, 'c1', '2026-09', PAYMENT_STATUS.UNBILLED, T2).length === 0)
  check(
    'payments: clearing an amount removes the field',
    withPaymentAmount(started, 'c1', '2026-09', undefined)[0].amount === undefined,
  )

  const ledger: PaymentRecord[] = [
    { key: 'c1:2026-07', clientId: 'c1', month: '2026-07', status: PAYMENT_STATUS.INVOICED, amount: 1000, invoicedAt: new Date(T_NOW - 31 * DAY).toISOString() },
    { key: 'c1:2026-08', clientId: 'c1', month: '2026-08', status: PAYMENT_STATUS.INVOICED, amount: 500.25, invoicedAt: new Date(T_NOW - 29 * DAY).toISOString() },
    { key: 'c2:2026-08', clientId: 'c2', month: '2026-08', status: PAYMENT_STATUS.PAID, amount: 300, invoicedAt: new Date(T_NOW - 60 * DAY).toISOString() },
    { key: 'c2:2026-09', clientId: 'c2', month: '2026-09', status: PAYMENT_STATUS.INVOICED, invoicedAt: new Date(T_NOW - DAY).toISOString() },
  ]
  const owed = outstandingSummary(ledger, T_NOW)
  check(
    'outstanding: sums invoiced amounts, leaves out paid ones',
    Math.abs(owed.total - 1500.25) < 1e-9 && owed.count === 3,
    owed,
  )
  check(
    'outstanding: counts overdue invoices (over 30 days) and invoices with no amount',
    owed.overdueCount === 1 && Math.abs(owed.overdueTotal - 1000) < 1e-9 && owed.withoutAmountCount === 1,
    owed,
  )
  check(
    'overdue: exactly 30 days is not yet overdue',
    !isOverdue({ ...ledger[1], invoicedAt: new Date(T_NOW - OVERDUE_AFTER_DAYS * DAY).toISOString() }, T_NOW),
  )
  check(
    'payments: a client filter narrows the outstanding total',
    outstandingSummary(ledger.filter((p) => p.clientId === 'c2'), T_NOW).total === 0,
  )

  const html = buildPrintHtml({
    authorName: 'Ada <b>Lovelace</b>',
    clientLabel: 'Acme',
    periodLabel: 'This month',
    from: '2026-09-01',
    to: '2026-09-30',
    currency: 'USD',
    locale: 'en-GB',
    generatedAt: 'now',
    lines: [
      { ...lines[1], projectTitle: '<img src=x onerror=alert(1)>', taskTitle: '<script>x</script>' },
    ],
  })
  check('print: user text is escaped', html.includes('&lt;script&gt;x&lt;/script&gt;') && !html.includes('<script>x'))
  check('print: no script runs in the report', !/<script/i.test(html))
  check('print: the author name is shown escaped', html.includes('Ada &lt;b&gt;Lovelace&lt;/b&gt;'))

  const backup = parseBackupFile({
    format: 'dayforge-backup',
    version: 1,
    goals: [{ ...goals[0] }],
    taskTemplates: [],
    dailyTasks: [],
    settings: { billing: { clients, payments } },
  })
  check('backup: a project keeps its client', backup?.goals[0].clientId === 'c1')
  const restored = backup?.settings as { billing?: { clients?: unknown; payments?: unknown } } | undefined
  check(
    'backup: clients and payments travel in the settings',
    same(restored?.billing?.clients, clients) && same(restored?.billing?.payments, payments),
  )

  const plainProject = goalRow({ id: 'goal-g', updatedAt: T0 })
  const withClient = goalRow({ id: 'goal-g', clientId: 'c1', updatedAt: T1 })
  check(
    'sync: a project client survives a whole-row merge in either direction',
    mergeRow(SYNC_TABLE.GOALS, plainProject, withClient).row.clientId === 'c1' &&
      mergeRow(SYNC_TABLE.GOALS, withClient, plainProject).row.clientId === 'c1',
  )

  const settingsRow: Record<string, unknown> = { id: 'settings', updatedAt: T1 }
  SYNCED_SECTIONS.forEach((section) => {
    settingsRow[section] = clone(DEFAULT_SETTINGS[section])
  })
  settingsRow.billing = { clients, payments }
  check(
    'sync: billing is a synced settings section, not held back',
    !('billing' in heldFromRow(settingsRow, SYNCED_SECTIONS, DEFAULT_SETTINGS)) &&
      (SYNCED_SECTIONS as readonly string[]).includes('billing'),
  )
}

/**
 * The Edge Function's reminder rules (supabase/functions/push-reminders/rules.ts)
 * must agree with the in-app rules on every case that matters, and the
 * messages must carry the same tags so one replaces the other.
 */
function verifyPushReminderParity() {
  section('Web Push reminders: the server rules agree with the in-app rules')

  const hours = [0, 1, 3, 8]
  const runs = [0, 3 * HOUR - 1, 3 * HOUR, 9 * HOUR]
  const longRunAgrees = hours.every((h) =>
    runs.every((ms) => isLongRunDue(ms, h) === serverIsLongRunDue(ms, h)),
  )
  check('long-run: the server and the app agree at every threshold', longRunAgrees)

  const sitting = 'sit-p'
  const sittingEntries = [
    entryAt(sitting, localAt(2026, 10, 21, 8, 0), localAt(2026, 10, 21, 9, 0)),
    entryAt(sitting, localAt(2026, 10, 21, 9, 30), localAt(2026, 10, 21, 10, 0)),
    entryAt('sit-other', localAt(2026, 10, 21, 6, 0), localAt(2026, 10, 21, 11, 0)),
  ]
  check(
    'long-run: the server counts a sitting the same way',
    serverSittingRunningMs(sittingEntries, sitting, 10 * MIN) === sittingRunningMs(sittingEntries, sitting, 10 * MIN),
  )

  const nudgeCases: Array<[number, number, string]> = [
    [17, 59, '18:00'], [18, 0, '18:00'], [21, 59, '22:00'], [22, 0, '22:00'], [23, 30, '23:30'], [19, 0, '23:30'],
  ]
  check(
    'end of day: the server fires at the same minute as the app',
    nudgeCases.every(([h, m, time]) =>
      isEndOfDay(new Date(2026, 9, 21, h, m), time) === isEndOfDayMinutes(h * 60 + m, time),
    ),
  )

  const quietCases: Array<[number, number]> = [[21, 59], [22, 0], [3, 0], [7, 59], [8, 0], [12, 0]]
  check(
    'quiet hours: a window that crosses midnight is judged the same way',
    quietCases.every(([h, m]) =>
      isWithinQuietHours(new Date(2026, 9, 21, h, m), '22:00', '08:00') ===
      isWithinQuietMinutes(h * 60 + m, '22:00', '08:00'),
    ),
  )
  check(
    'quiet hours: an empty window (start equals end) is silent on both sides',
    !isWithinQuietHours(new Date(2026, 9, 21, 9, 0), '09:00', '09:00') &&
      !isWithinQuietMinutes(9 * 60, '09:00', '09:00'),
  )

  const day = '2026-10-21'
  const now = localAt(2026, 10, 21, 10, 0)
  const clock: Clock = {
    now,
    today: day,
    minutesOfDay: 10 * 60,
    localMs,
  }
  const planTasks = [
    blockTask('t1', day, '09:00', '10:00'),
    blockTask('t2', day, '09:30', '10:30'),
    blockTask('done', day, '09:10', '09:40', 'done'),
    blockTask('later', day, '10:30', '11:00'),
  ]
  const planEntries = [entryAt('q', localAt(2026, 10, 21, 9, 6), localAt(2026, 10, 21, 9, 15), 't1')]
  const none = (): boolean => false

  const pickClient = pickPlannedStart(planTasks, day, now, planEntries, none)
  const pickServer = serverPickPlannedStart(planTasks as unknown as ServerTask[], day, now, planEntries, localMs, none)
  check(
    'planned start: the same block is picked (most recent due, not done, not tracked)',
    pickClient?.templateId === 't2' && pickServer?.templateId === 't2',
    { client: pickClient?.templateId, server: pickServer?.templateId },
  )
  check(
    'planned start: the grace period matches the app',
    SERVER_PLANNED_START_GRACE_MS === 5 * MIN,
  )

  const endBlocks = planTasks.map((task) => ({
    templateId: task.templateId,
    title: task.title,
    date: task.date,
    startTime: task.startTime,
    endTime: task.endTime,
  })) as PlannedBlock[]
  const clientLoggable = loggableBlocks(endBlocks, sittingEntries, now).length
  const serverLoggable = loggableCount(endBlocks, sittingEntries, now, localMs)
  check('end of day: the same blocks count as unlogged', clientLoggable === serverLoggable, { clientLoggable, serverLoggable })
  check(
    'end of day: the nudge wording is shared',
    serverPlannedNudgeLabel(1) === plannedNudgeLabel(1) && serverPlannedNudgeLabel(3) === plannedNudgeLabel(3),
  )

  // Message tags and dedupe keys, through the full decision.
  const runningTimer: ServerTimer = {
    sessionId: 'sit-x',
    status: 'running',
    startedAt: localAt(2026, 10, 21, 5, 0),
    task: { taskId: 't1', taskTitle: 'Deep work' },
  }
  const longRun = decideReminders({
    clock: { ...clock, now: localAt(2026, 10, 21, 8, 30) },
    settings: null,
    timer: runningTimer,
    entries: [],
    tasks: [],
    wasSent: () => false,
  })
  check(
    'a long run pushes once, tagged like the in-app browser notification',
    longRun.length === 1 &&
      longRun[0].kind === 'long-run' &&
      longRun[0].tag === 'long-sit-x' &&
      longRun[0].ref === 'sit-x:3' &&
      longRun[0].body === 'Timer on "Deep work" has been running for 3 h',
    longRun,
  )
  const longRunSent = decideReminders({
    clock: { ...clock, now: localAt(2026, 10, 21, 8, 30) },
    settings: null,
    timer: runningTimer,
    entries: [],
    tasks: [],
    wasSent: (kind, ref) => kind === 'long-run' && ref === 'sit-x:3',
  })
  check('a long run already pushed is not pushed again', longRunSent.length === 0)

  const plannedDue = decideReminders({
    clock: { ...clock, now: localAt(2026, 10, 21, 9, 10), minutesOfDay: 9 * 60 + 10 },
    settings: null,
    timer: null,
    entries: [],
    tasks: [planTasks[0]] as unknown as ServerTask[],
    wasSent: () => false,
  })
  check(
    'planned start pushes a block started 5+ minutes ago with nothing running, tagged like the app',
    plannedDue.length === 1 &&
      plannedDue[0].kind === 'planned-start' &&
      plannedDue[0].tag === `planned-${planTasks[0].id}` &&
      plannedDue[0].ref === planTasks[0].id &&
      plannedDue[0].body === '"Block t1" started 10 min ago',
    plannedDue,
  )
  const plannedWhileRunning = decideReminders({
    clock: { ...clock, now: localAt(2026, 10, 21, 9, 10), minutesOfDay: 9 * 60 + 10 },
    settings: null,
    timer: { ...runningTimer, startedAt: localAt(2026, 10, 21, 9, 0) },
    entries: [],
    tasks: [planTasks[0]] as unknown as ServerTask[],
    wasSent: () => false,
  })
  check(
    'planned start is held back while a timer is running',
    !plannedWhileRunning.some((message) => message.kind === 'planned-start'),
  )
  const plannedSent = decideReminders({
    clock: { ...clock, now: localAt(2026, 10, 21, 9, 10), minutesOfDay: 9 * 60 + 10 },
    settings: null,
    timer: null,
    entries: [],
    tasks: [planTasks[0]] as unknown as ServerTask[],
    wasSent: (kind, ref) => kind === 'planned-start' && ref === planTasks[0].id,
  })
  check('planned start is sent once per block', plannedSent.length === 0)

  // The block is also due for a planned-start push; these cases are about the nudge.
  const plannedAlreadySent = (kind: string): boolean => kind === 'planned-start'
  const nudgeClock = { ...clock, now: localAt(2026, 10, 21, 22, 0), minutesOfDay: 22 * 60 }
  const nudgeTasks = [blockTask('n1', day, '09:00', '10:00')] as unknown as ServerTask[]
  const nudge = decideReminders({
    clock: nudgeClock,
    settings: null,
    timer: null,
    entries: [],
    tasks: nudgeTasks,
    wasSent: plannedAlreadySent,
  })
  check(
    'end of day pushes at 22:00 by default when a finished block has no time',
    nudge.length === 1 && nudge[0].kind === 'end-of-day' && nudge[0].body === plannedNudgeLabel(1) && nudge[0].ref === day,
    nudge,
  )
  check(
    'end of day stays quiet before its time',
    decideReminders({
      clock: { ...nudgeClock, minutesOfDay: 21 * 60 + 59 },
      settings: null,
      timer: null,
      entries: [],
      tasks: nudgeTasks,
      wasSent: plannedAlreadySent,
    }).length === 0,
  )
  check(
    'end of day is sent once a day',
    decideReminders({
      clock: nudgeClock,
      settings: null,
      timer: null,
      entries: [],
      tasks: nudgeTasks,
      wasSent: (kind, ref) => plannedAlreadySent(kind) || (kind === 'end-of-day' && ref === day),
    }).length === 0,
  )

  const quiet = decideReminders({
    clock: { ...nudgeClock, minutesOfDay: 23 * 60 },
    settings: { notifications: { quietHours: true, quietFrom: '22:00', quietTo: '08:00' } },
    timer: { ...runningTimer, startedAt: localAt(2026, 10, 20, 1, 0) },
    entries: [],
    tasks: nudgeTasks,
    wasSent: () => false,
  })
  check('quiet hours silence every server push', quiet.length === 0, quiet)

  const longRunOff = decideReminders({
    clock: { ...clock, now: localAt(2026, 10, 21, 12, 0), minutesOfDay: 12 * 60 },
    settings: { timer: { longRunHours: 0 } },
    timer: runningTimer,
    entries: [],
    tasks: [],
    wasSent: () => false,
  })
  check('a long run never pushes when switched off', longRunOff.length === 0)
}

function main() {
  verifyPushReminderParity()
  verifyTimerReminders()
  verifyBudgetPlanIncome()
  verifyClientsAndBilling()
  verifyUpcomingTasks()
  verifyAccountDeletionWipe()
  verifyBoardFields()
  verifyBoardPersistence()
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
