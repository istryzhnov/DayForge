/** Compat checks: task notes, the board, upcoming tasks and day lists. */

import { diffRows, snapshotRows } from '../../../src/sync/diff'
import { mergeCollection, mergeRow } from '../../../src/sync/merge'
import {
  partitionLive,
  restampForRestore,
} from '../../../src/sync/tombstoneRules'
import { SYNC_TABLE, type SyncedRow } from '../../../src/sync/types'
import { migrateGoals } from '../../../src/composables/goalSpace/goalMigration'
import {
  NOTES_MAX_LENGTH,
  normalizeNotes,
} from '../../../src/composables/goalSpace/notes'
import { parseBackupFile } from '../../../src/features/settings/composables/backupFormat'
import type { Goal } from '../../../src/entities/GoalEntity'
import { describeRecurrence } from '../../../src/composables/goalSpace/recurrence'
import { collectUpcoming } from '../../../src/features/tasks/composables/useUpcomingTasks'
import {
  dayHeadingLabel,
  doneCountsOf,
  groupByDay,
} from '../../../src/features/tasks/composables/dayGroups'
import type { DailyTask, TaskTemplate } from '../../../src/entities/TaskEntity'
import {
  BOARD_COLUMN,
  buildBoardCards,
  columnOf,
  planBoardMove,
  type BoardColumn,
} from '../../../src/features/board/composables/boardModel'
import {
  FUTURE,
  T0,
  T1,
  T2,
  check,
  clone,
  dailyRow,
  goalRow,
  same,
  section,
} from './harness'

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

export function verifyTaskNotes() {
  section('Task notes survive sync, restore and the outbox')

  const table = SYNC_TABLE.TASK_TEMPLATES
  const withNotes = templateRow({
    notes: 'Call the bank\nAsk about fees',
    updatedAt: T1,
  })
  const older = templateRow({ notes: 'Call the bank', updatedAt: T0 })

  const kept = mergeRow(table, withNotes, older)
  check(
    'a newer local note wins with its full text',
    kept.row.notes === withNotes.notes,
    kept.row,
  )

  const incoming = templateRow({ notes: 'From the phone', updatedAt: T2 })
  const taken = mergeRow(table, withNotes, incoming)
  check(
    'a newer remote note is taken whole',
    taken.row.notes === 'From the phone',
    taken.row,
  )

  const cleared = templateRow({ updatedAt: T2 })
  const dropped = mergeRow(table, cleared, older)
  check(
    'a note cleared on one device stays cleared after merge',
    !('notes' in dropped.row),
    dropped.row,
  )

  const restored = restampForRestore(withNotes)
  check('a restore keeps the note', restored.notes === withNotes.notes)

  const shadow = snapshotRows([templateRow({ updatedAt: T0 })])
  const diff = diffRows(shadow, [
    templateRow({ notes: 'New note', updatedAt: T1 }),
  ])
  check(
    'adding a note is a change the outbox sees',
    diff.changes.length === 1 && diff.changes[0].op === 'upsert',
  )

  check(
    'a template without notes is untouched by the diff',
    diffRows(snapshotRows([templateRow()]), [templateRow()]).changes.length ===
      0,
  )

  check('notes are trimmed', normalizeNotes('  Buy milk \n') === 'Buy milk')
  check(
    'blank notes mean no note at all',
    normalizeNotes(' \n\t ') === undefined,
  )
  check(
    'notes are capped at the limit',
    (normalizeNotes('x'.repeat(NOTES_MAX_LENGTH + 50)) ?? '').length ===
      NOTES_MAX_LENGTH,
  )
}

export function verifyProjectNotes() {
  section('Project notes travel with the project row')

  const withNotes = goalRow({
    id: 'goal-n',
    notes: 'Ideas\n\nlinks',
    updatedAt: T1,
  })
  const withoutNotes = goalRow({ id: 'goal-n', updatedAt: T0 })
  check(
    'notes survive a whole-row merge in either direction',
    mergeRow(SYNC_TABLE.GOALS, withoutNotes, withNotes).row.notes ===
      'Ideas\n\nlinks' &&
      mergeRow(SYNC_TABLE.GOALS, withNotes, withoutNotes).row.notes ===
        'Ideas\n\nlinks',
  )

  const migrated = clone(withNotes) as unknown as Goal
  migrateGoals([migrated])
  check(
    'notes are kept through migrateGoals',
    migrated.notes === 'Ideas\n\nlinks',
  )

  const backup = parseBackupFile({
    format: 'dayforge-backup',
    version: 1,
    goals: [clone(withNotes)],
    taskTemplates: [],
    dailyTasks: [],
  })
  check(
    'notes survive a backup round trip',
    backup !== null && backup.goals[0].notes === 'Ideas\n\nlinks',
  )

  check(
    'a project without notes has no notes key',
    !('notes' in goalRow({ id: 'goal-m' })),
  )
  check(
    'blank notes normalise to nothing',
    normalizeNotes('  \n ') === undefined,
  )
}

export function verifyBoardFields() {
  section('Board fields travel and read safely both ways')

  const project = goalRow({ id: 'goal-b', boardEnabled: true })
  const projectOff = goalRow({ id: 'goal-b', updatedAt: T0 })
  const projectOn = goalRow({ id: 'goal-b', boardEnabled: true, updatedAt: T1 })
  check(
    'boardEnabled survives a whole-row merge in either direction',
    mergeRow(SYNC_TABLE.GOALS, projectOff, projectOn).row.boardEnabled ===
      true &&
      mergeRow(SYNC_TABLE.GOALS, projectOn, projectOff).row.boardEnabled ===
        true,
  )
  const migratedProject = clone(project) as unknown as Goal
  migrateGoals([migratedProject])
  check(
    'boardEnabled is kept through migrateGoals',
    migratedProject.boardEnabled === true,
  )

  const task = {
    ...goalRow({ id: 'task-b', title: 'Task' }),
    boardStage: 'doing',
    isActive: true,
    parentTemplateId: undefined,
  }
  const liveTask = partitionLive(SYNC_TABLE.TASK_TEMPLATES, [clone(task)])
    .live[0]
  check('boardStage survives partitionLive', liveTask.boardStage === 'doing')

  const taskOther = { ...clone(task), updatedAt: T2 }
  const taskStale = { ...clone(task), boardStage: undefined, updatedAt: T0 }
  check(
    'boardStage is not lost when a newer edit comes from another device',
    mergeCollection(SYNC_TABLE.TASK_TEMPLATES, [taskStale], [taskOther])
      .merged[0]?.boardStage === 'doing',
  )

  const restored = restampForRestore(clone(task) as unknown as SyncedRow)
  check(
    'boardStage survives a restore from undo',
    restored.boardStage === 'doing',
  )

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
  check(
    'a project without the flag has no boardEnabled key',
    !('boardEnabled' in plainOld),
  )

  const row = dailyRow({
    templateId: 'task-b',
    id: 'task-b::2026-09-02',
  }) as unknown as DailyTask
  const unknownStage = {
    ...task,
    boardStage: 'review',
  } as unknown as TaskTemplate
  check(
    'an unknown stage from a newer build reads as todo',
    columnOf(row, unknownStage) === BOARD_COLUMN.TODO,
  )
  check(
    'a missing stage reads as todo',
    columnOf(row, {
      ...task,
      boardStage: undefined,
    } as unknown as TaskTemplate) === BOARD_COLUMN.TODO,
  )
  check(
    'a doing stage reads as in progress',
    columnOf(row, task as unknown as TaskTemplate) === BOARD_COLUMN.DOING,
  )
  check(
    'a done row reads as done whatever its stage',
    columnOf({ ...row, status: 'done' }, task as unknown as TaskTemplate) ===
      BOARD_COLUMN.DONE,
  )

  const cleared = { ...clone(task), boardClearedAt: T1 }
  check(
    'boardClearedAt survives partitionLive',
    partitionLive(SYNC_TABLE.TASK_TEMPLATES, [clone(cleared)]).live[0]
      .boardClearedAt === T1,
  )
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
  check(
    'boardClearedAt survives restore from undo',
    restampForRestore(clone(cleared) as unknown as SyncedRow).boardClearedAt ===
      T1,
  )
  const clearedBackup = parseBackupFile({
    format: 'dayforge-backup',
    version: 1,
    goals: [clone(project)],
    taskTemplates: [clone(cleared)],
    dailyTasks: [],
  })
  check(
    'boardClearedAt survives a backup round trip',
    clearedBackup !== null &&
      (clearedBackup.taskTemplates[0] as unknown as SyncedRow)
        .boardClearedAt === T1,
  )
  check(
    'a task never cleared has no boardClearedAt key',
    !('boardClearedAt' in task),
  )

  const oneOff = task as unknown as TaskTemplate
  const repeating = {
    ...task,
    recurrence: { type: 'daily', startDate: '2026-09-01' },
  } as unknown as TaskTemplate
  const openOf = (cards: ReturnType<typeof buildBoardCards>) =>
    [...cards.todo, ...cards.doing][0]
  const openCard = openOf(buildBoardCards([row], [oneOff], BOARD_DAY))
  const repeatingCard = openOf(buildBoardCards([row], [repeating], BOARD_DAY))
  check('a card exists for the open task', openCard !== undefined)
  check(
    'moving an open one-off to done only toggles it',
    same(planBoardMove(openCard, BOARD_COLUMN.DONE), { toggleDone: true }),
  )
  check(
    'a repeating card on its own day can be finished',
    repeatingCard !== undefined &&
      repeatingCard.canFinish &&
      same(planBoardMove(repeatingCard, BOARD_COLUMN.DONE), {
        toggleDone: true,
      }),
  )
  const doneCard = buildBoardCards(
    [{ ...row, status: 'done', completedAt: T1 }],
    [oneOff],
    BOARD_DAY,
  ).done[0]
  check(
    'moving out of done un-completes it and sets the stage',
    same(planBoardMove(doneCard, BOARD_COLUMN.DOING), {
      toggleDone: true,
      stage: 'doing',
    }),
  )
  check(
    'moving back to to do clears the stage',
    same(planBoardMove(openCard, BOARD_COLUMN.TODO), {
      toggleDone: false,
      stage: null,
    }),
  )
}

// --- persistence across days -------------------------------------------------
const BOARD_DAY = '2026-09-10'

const BOARD_NEXT_DAY = '2026-09-11'

function weekdayOf(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).getDay()
}

export function verifyBoardPersistence() {
  section('The board follows the project, not the day it is viewed')

  const template = (id: string, extra: Record<string, unknown> = {}) =>
    templateRow({ id, title: id, ...extra }) as unknown as TaskTemplate
  const rowOf = (
    templateId: string,
    date: string,
    extra: Record<string, unknown> = {},
  ) =>
    dailyRow({
      id: `${templateId}::${date}`,
      templateId,
      date,
      title: templateId,
      ...extra,
    }) as unknown as DailyTask

  const open = template('task-open', { order: 1 })
  const oldDone = template('task-old-done', { order: 2 })
  const future = template('task-future', {
    order: 3,
    recurrence: { type: 'none', startDate: '2026-09-14' },
  })
  const daily = template('task-daily', {
    order: 4,
    recurrence: { type: 'daily', startDate: '2026-09-01' },
  })
  const habit = template('task-habit', {
    order: 5,
    recurrence: { type: 'daily', startDate: '2026-09-01' },
  })
  const weekly = template('task-weekly', {
    order: 6,
    recurrence: {
      type: 'weekly',
      startDate: '2026-09-01',
      daysOfWeek: [weekdayOf(BOARD_NEXT_DAY)],
    },
  })
  const undated = template('task-undated', {
    order: 7,
    recurrence: { type: 'weekly', startDate: '2026-09-01', daysOfWeek: [] },
  })
  const proj = template('task-proj', { order: 8 })
  const child = template('task-child', {
    order: 9,
    parentTemplateId: 'task-proj',
  })
  const inactive = template('task-gone', { order: 10, isActive: false })
  const templates = [
    open,
    oldDone,
    future,
    daily,
    habit,
    weekly,
    undated,
    proj,
    child,
    inactive,
  ]

  const rows = [
    rowOf('task-open', BOARD_DAY),
    rowOf('task-old-done', '2026-09-08', {
      status: 'done',
      completedAt: '2026-09-08T12:00:00.000Z',
    }),
    rowOf('task-future', '2026-09-14'),
    rowOf('task-daily', BOARD_DAY),
    rowOf('task-habit', BOARD_DAY, {
      status: 'done',
      completedAt: `${BOARD_DAY}T08:00:00.000Z`,
    }),
    rowOf('task-proj', BOARD_DAY),
    rowOf('task-child', BOARD_DAY, {
      parentDailyTaskId: `task-proj::${BOARD_DAY}`,
    }),
    rowOf('task-gone', BOARD_DAY),
  ]

  const cards = buildBoardCards(rows, templates, BOARD_DAY)
  const ids = (column: BoardColumn) => cards[column].map((card) => card.id)
  const cardOf = (id: string) =>
    [...cards.todo, ...cards.doing, ...cards.done].find(
      (card) => card.id === id,
    )

  check(
    'an open task shows in To do, dated today',
    ids('todo').includes('task-open') &&
      cardOf('task-open')?.date === BOARD_DAY,
  )
  check(
    "an earlier day's finished one-off stays in Done",
    ids('done').includes('task-old-done'),
  )
  check(
    'a task scheduled ahead shows with its date',
    cardOf('task-future')?.date === '2026-09-14' &&
      ids('todo').includes('task-future'),
  )
  check(
    'a repeating task shows once, for today',
    ids('todo').filter((id) => id === 'task-daily').length === 1 &&
      cardOf('task-daily')?.canFinish === true,
  )
  check(
    'a repeating task done today is in Done',
    ids('done').includes('task-habit'),
  )
  check(
    'a repeating task not due today shows its next date and cannot be finished',
    cardOf('task-weekly')?.date === BOARD_NEXT_DAY &&
      cardOf('task-weekly')?.canFinish === false,
  )
  check(
    'a subtask is counted on its project card, not shown on its own',
    !cardOf('task-child') &&
      cardOf('task-proj')?.subtasksTotal === 1 &&
      cardOf('task-proj')?.subtasksDone === 0,
  )
  check(
    'the project card carries its subtask ids for the timer rollup',
    same(cardOf('task-proj')?.childTemplateIds, ['task-child']),
  )
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
  check(
    'a finished one-off is still in Done the next day',
    nextDay.done.some((card) => card.id === 'task-old-done'),
  )
  check(
    'an open task is still on the board the next day',
    nextDay.todo.some((card) => card.id === 'task-open'),
  )
  check(
    'a habit done today is back in To do tomorrow',
    nextDay.todo.some((card) => card.id === 'task-habit') &&
      !nextDay.done.some((card) => card.id === 'task-habit'),
  )

  const clearedAt = `${BOARD_DAY}T09:00:00.000Z`
  const clearedTemplates = templates.map((item) =>
    item.id === 'task-old-done' || item.id === 'task-habit'
      ? { ...item, boardClearedAt: clearedAt }
      : item,
  ) as TaskTemplate[]
  const afterClear = buildBoardCards(rows, clearedTemplates, BOARD_DAY)
  check(
    'clear done hides a cleared one-off and a cleared habit from Done',
    afterClear.done.length === 0,
  )
  check(
    'clear done leaves open cards alone',
    afterClear.todo.some((card) => card.id === 'task-open'),
  )
  check('clearing does not remove the rows', rows.length === 8)

  const recompleted = buildBoardCards(
    [
      ...rows.filter((row) => row.templateId !== 'task-habit'),
      rowOf('task-habit', BOARD_DAY, {
        status: 'done',
        completedAt: `${BOARD_DAY}T10:30:00.000Z`,
      }),
    ],
    clearedTemplates,
    BOARD_DAY,
  )
  check(
    'a card un-finished and finished again after clearing comes back',
    recompleted.done.some((card) => card.id === 'task-habit'),
  )

  const twoDone = buildBoardCards(
    [
      rowOf('task-old-done', '2026-09-08', {
        status: 'done',
        completedAt: '2026-09-08T12:00:00.000Z',
      }),
      rowOf('task-habit', BOARD_DAY, {
        status: 'done',
        completedAt: `${BOARD_DAY}T08:00:00.000Z`,
      }),
    ],
    [oldDone, habit],
    BOARD_DAY,
  )
  check(
    'Done sorts by completion, newest first',
    twoDone.done.map((card) => card.id).join(',') ===
      'task-habit,task-old-done',
  )

  const moveOnFuture = buildBoardCards(rows, templates, BOARD_DAY).todo.find(
    (card) => card.id === 'task-weekly',
  )
  check(
    'a repeating task not due today cannot be moved to Done',
    moveOnFuture !== undefined &&
      same(planBoardMove(moveOnFuture, BOARD_COLUMN.DONE), {
        toggleDone: false,
      }),
  )
  check(
    'a repeating task not due today can still change column',
    moveOnFuture !== undefined &&
      same(planBoardMove(moveOnFuture, BOARD_COLUMN.DOING), {
        toggleDone: false,
        stage: 'doing',
      }),
  )
}

export function verifyUpcomingTasks() {
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
  const row = (
    templateId: string,
    date: string,
    overrides: Record<string, unknown>,
  ) =>
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

  const oneOff = template('oneoff', {
    goalId: 'g1',
    startTime: '09:00',
    endTime: '10:00',
    recurrence: { type: 'none', startDate: '2026-10-22' },
  })
  const every8 = template('every8', {
    goalId: 'g1',
    recurrence: { type: 'daily', interval: 8, startDate: '2026-10-24' },
  })
  const daily = template('daily', {
    goalId: 'g2',
    recurrence: { type: 'daily', interval: 1, startDate: FROM },
  })
  const today = template('today', {
    goalId: 'g1',
    recurrence: { type: 'none', startDate: FROM },
  })
  const far = template('far', {
    goalId: 'g1',
    recurrence: { type: 'none', startDate: '2026-11-03' },
  })
  const edge = template('edge', {
    goalId: 'g1',
    recurrence: { type: 'none', startDate: '2026-11-02' },
  })
  const inactive = template('inactive', {
    goalId: 'g1',
    isActive: false,
    recurrence: { type: 'none', startDate: '2026-10-21' },
  })
  const done = row('oneoff', '2026-10-22', {
    goalId: 'g1',
    status: 'done',
    completedAt: T1,
  })
  const templates = [oneOff, every8, daily, today, far, edge, inactive]

  const all = collectUpcoming(templates, [done], FROM, 14, null)
  const items = all.flatMap((day) =>
    day.items.map((item) => ({ ...item, date: day.date })),
  )
  const byTemplate = (id: string) =>
    items.filter((item) => item.templateId === id)

  section('Upcoming tasks')
  check(
    'the window is sorted by date',
    same(
      all.map((day) => day.date),
      [...all.map((day) => day.date)].sort(),
    ),
  )
  check(
    'a one-off task on a future date is listed on that date',
    byTemplate('oneoff').length === 1 &&
      byTemplate('oneoff')[0].date === '2026-10-22',
  )
  check(
    'a materialized row is not listed twice',
    byTemplate('oneoff').length === 1,
  )
  check(
    'a done row is listed as done',
    byTemplate('oneoff')[0]?.isDone === true,
  )
  check(
    'a one-off task has no repeat label',
    byTemplate('oneoff')[0]?.repeatLabel === undefined,
  )
  check('the viewed date itself is left out', byTemplate('today').length === 0)
  check('a task 15 days out is left out', byTemplate('far').length === 0)
  check(
    'a task on the last day of the window is kept',
    byTemplate('edge').length === 1,
  )
  check('an inactive task is left out', byTemplate('inactive').length === 0)
  check(
    'an every-8-days task shows once, at its start',
    byTemplate('every8').length === 1 &&
      byTemplate('every8')[0].date === '2026-10-24',
  )
  check(
    'an every-8-days task carries its rule',
    byTemplate('every8')[0]?.repeatLabel === 'Every 8 days',
  )
  check(
    'a daily task shows once, at its first day in the window',
    byTemplate('daily').length === 1 &&
      byTemplate('daily')[0].date === '2026-10-20',
  )
  check(
    'a daily task carries the Daily label',
    byTemplate('daily')[0]?.repeatLabel === 'Daily',
  )

  const oneProject = collectUpcoming(templates, [done], FROM, 14, 'g2')
  const oneProjectItems = oneProject.flatMap((day) => day.items)
  check(
    'a project filter keeps only that project',
    oneProjectItems.length === 1 && oneProjectItems[0].templateId === 'daily',
  )

  check(
    'weekly rules name their weekdays',
    describeRecurrence({
      type: 'weekly',
      daysOfWeek: [1, 3],
      startDate: FROM,
    }) === 'Weekly · Mon, Wed',
  )
  check(
    'a yearly rule reads as every year',
    describeRecurrence({ type: 'yearly', startDate: FROM }) === 'Every year',
  )
}

export function verifyDayLists() {
  section('Day lists: grouping, headings and done counts')

  const rows = [
    { id: 'a', date: '2026-10-27' },
    { id: 'b', date: '2026-10-27' },
    { id: 'c', date: '2026-10-26' },
    { id: 'd', date: '2026-10-27' },
  ]
  const groups = groupByDay(rows)
  check(
    'groupByDay: neighbours on one date share a group',
    groups.length === 3 && groups[0].items.length === 2,
  )
  check(
    'groupByDay: a date that comes back starts a new group, order kept',
    same(
      groups.map((group) => group.items.map((row) => row.id)),
      [['a', 'b'], ['c'], ['d']],
    ),
  )
  check('groupByDay: no rows, no groups', groupByDay([]).length === 0)

  check(
    'dayHeadingLabel: weekday and day-month in English',
    dayHeadingLabel('2026-10-27', 'en-GB') === 'Tuesday, 27 October',
  )
  check(
    'dayHeadingLabel: a single-digit day has no leading zero',
    dayHeadingLabel('2026-09-03', 'en-GB') === 'Thursday, 3 September',
  )
  check(
    'dayHeadingLabel: names follow the chosen language, capital first',
    dayHeadingLabel('2026-10-27', 'uk-UA') === 'Вівторок, 27 жовтня',
  )

  // 25 Oct 2026 is a Sunday; with weeks starting Monday it sits in the week before.
  const dates = [
    '2026-10-01',
    '2026-10-25',
    '2026-10-26',
    '2026-10-31',
    '2026-11-01',
  ]
  check(
    'doneCountsOf: Monday-start week and month around today',
    same(doneCountsOf(dates, '2026-10-27', 1), { thisWeek: 3, thisMonth: 4 }),
  )
  check(
    'doneCountsOf: a Sunday does not count in a Monday-start week',
    doneCountsOf(['2026-10-25'], '2026-10-27', 1).thisWeek === 0,
  )
  check(
    'doneCountsOf: a Sunday counts in a Sunday-start week',
    doneCountsOf(['2026-10-25'], '2026-10-27', 0).thisWeek === 1,
  )
  check(
    'doneCountsOf: the week ends before the next Sunday',
    doneCountsOf(['2026-11-01'], '2026-10-27', 0).thisWeek === 0,
  )
  check(
    'doneCountsOf: nothing done, zero counts',
    same(doneCountsOf([], '2026-10-27', 1), { thisWeek: 0, thisMonth: 0 }),
  )
}
