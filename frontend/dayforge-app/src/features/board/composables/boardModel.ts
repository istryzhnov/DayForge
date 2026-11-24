import type { DailyTask, TaskTemplate } from '../../../entities/TaskEntity'
import type {
  ID,
  ISODate,
  ISODateTime,
  Priority,
  TimeOfDay,
} from '../../../entities/types'
import {
  BOARD_STAGE,
  TASK_STATUS,
  type BoardStage,
} from '../../../entities/constants'
import {
  isRepeating,
  occursOn,
} from '../../../shared/composables/goalSpace/recurrence'
import {
  addDaysToISODate,
  dailyTaskId,
} from '../../../shared/composables/goalSpace/date'
import type { BoardCustomColumn } from '../../../entities/GoalEntity'
import { sortTasks } from '../../../shared/composables/goalSpace/taskOrder'

/**
 * Pure board rules, kept free of Vue so the sync harness can check them.
 *
 * The board is a view of a project's overall progress, not of one day. Each
 * top-level task is one card, whatever day it was made on:
 *
 * - A one-off task reads its latest daily row. Its done state is that row's
 *   status, so a task finished on an earlier day stays in Done.
 * - A repeating task reads today's occurrence. If it does not occur today the
 *   card shows the next occurrence date, and it cannot be finished from the
 *   board until that day arrives.
 *
 * A card's column is decided by its done state and, for the open columns, by
 * the template's stage. Done is never stored as a stage.
 */

export const BOARD_COLUMN = {
  TODO: 'todo',
  DOING: 'doing',
  DONE: 'done',
} as const

/** A built-in column, or the id of a column the project added itself. */
export type BoardColumn = string

/**
 * A column as the board draws it. Built-in ones carry a message key
 * (`titleKey`, rendered with t()); a project's own carry their typed `title`.
 */
export interface BoardColumnDef {
  key: BoardColumn
  titleKey?: string
  title?: string
  custom: boolean
}

/** The three built-in columns, in order. */
export const BOARD_COLUMNS: ReadonlyArray<BoardColumnDef> = [
  { key: BOARD_COLUMN.TODO, titleKey: 'board.columnTodo', custom: false },
  { key: BOARD_COLUMN.DOING, titleKey: 'board.columnDoing', custom: false },
  { key: BOARD_COLUMN.DONE, titleKey: 'board.columnDone', custom: false },
]

/**
 * A project's board, left to right: To do, In progress, then its own columns
 * (stages between working on something and finishing it), then Done.
 */
export function boardColumnsFor(
  custom: ReadonlyArray<BoardCustomColumn> = [],
): BoardColumnDef[] {
  return [
    BOARD_COLUMNS[0],
    BOARD_COLUMNS[1],
    ...custom.map((column) => ({
      key: column.id,
      title: column.title,
      custom: true,
    })),
    BOARD_COLUMNS[2],
  ]
}

/** How far ahead a repeating task is searched for its next occurrence. */
const NEXT_OCCURRENCE_SEARCH_DAYS = 800

/** Whether a value names one of this board's columns. */
export function isBoardColumn(
  value: unknown,
  customIds: ReadonlyArray<string> = [],
): value is BoardColumn {
  return (
    value === BOARD_COLUMN.TODO ||
    value === BOARD_COLUMN.DOING ||
    value === BOARD_COLUMN.DONE ||
    (typeof value === 'string' && customIds.includes(value))
  )
}

/**
 * A task's open stage: "doing", one of the project's own column ids, or
 * "todo". A missing or unrecognised stage — say, a column that was removed on
 * another device — counts as "todo".
 */
export function stageOf(
  template: TaskTemplate | undefined,
  customIds: ReadonlyArray<string> = [],
): BoardStage | string {
  const stage = template?.boardStage
  if (stage === BOARD_STAGE.DOING) return BOARD_STAGE.DOING
  if (stage !== undefined && customIds.includes(stage)) return stage
  return BOARD_STAGE.TODO
}

/** Column of an open (not done) task. */
export function openColumnOf(
  template: TaskTemplate | undefined,
  customIds: ReadonlyArray<string> = [],
): BoardColumn {
  return stageOf(template, customIds)
}

export function columnOf(
  row: DailyTask,
  template: TaskTemplate | undefined,
  customIds: ReadonlyArray<string> = [],
): BoardColumn {
  if (row.status === TASK_STATUS.DONE) return BOARD_COLUMN.DONE
  return openColumnOf(template, customIds)
}

export interface BoardCard {
  /** The top-level task's template id: one card per task. */
  id: ID
  templateId: ID
  title: string
  priority: Priority
  template: TaskTemplate
  column: BoardColumn
  /**
   * The day the card stands for: the row's day for a one-off task, today's or
   * the next occurrence for a repeating one. Undefined when a repeating task
   * has no upcoming occurrence.
   */
  date?: ISODate
  isRepeating: boolean
  /** The daily row the card's done state reads, when one exists. */
  row?: DailyTask
  done: boolean
  completedAt?: ISODateTime
  startTime?: TimeOfDay
  /** False while a repeating card's day is not today: it cannot be finished yet. */
  canFinish: boolean
  /** Active subtasks, so the timer can roll their time up into this card. */
  childTemplateIds: ID[]
  subtasksDone: number
  subtasksTotal: number
}

/** Cards per column; the built-in three are always present. */
export type BoardCards = Record<BoardColumn, BoardCard[]> & {
  todo: BoardCard[]
  doing: BoardCard[]
  done: BoardCard[]
}

interface TaskState {
  date?: ISODate
  row?: DailyTask
  done: boolean
  completedAt?: ISODateTime
}

function latestRow(rows: DailyTask[]): DailyTask | undefined {
  let best: DailyTask | undefined
  rows.forEach((row) => {
    if (
      !best ||
      row.date > best.date ||
      (row.date === best.date && (row.updatedAt ?? '') > (best.updatedAt ?? ''))
    ) {
      best = row
    }
  })
  return best
}

function nextOccurrenceAfter(
  template: TaskTemplate,
  today: ISODate,
): ISODate | undefined {
  for (let offset = 1; offset <= NEXT_OCCURRENCE_SEARCH_DAYS; offset += 1) {
    const date = addDaysToISODate(today, offset)
    if (occursOn(template, date)) return date
  }
  return undefined
}

/** What the card for one task says about its day, given the rows it has. */
function stateOf(
  template: TaskTemplate,
  rows: DailyTask[],
  today: ISODate,
): TaskState {
  if (!isRepeating(template)) {
    const row = latestRow(rows)
    return {
      date: row?.date,
      row,
      done: row?.status === TASK_STATUS.DONE,
      completedAt: row?.completedAt,
    }
  }

  const todayRow = rows.find((row) => row.date === today)
  if (todayRow || occursOn(template, today)) {
    return {
      date: today,
      row: todayRow,
      done: todayRow?.status === TASK_STATUS.DONE,
      completedAt: todayRow?.completedAt,
    }
  }

  return { date: nextOccurrenceAfter(template, today), done: false }
}

/**
 * A done card is hidden once it was cleared at or after it was completed.
 * Un-completing and completing again gives a later completion time, so the
 * card comes back on its own.
 */
export function isClearedFromBoard(
  template: TaskTemplate,
  completedAt: ISODateTime | undefined,
): boolean {
  if (!template.boardClearedAt) return false
  return template.boardClearedAt >= (completedAt ?? '')
}

/** Overdue or today first, then upcoming, then undated. */
function dueRank(card: BoardCard, today: ISODate): number {
  if (!card.date) return 2
  return card.date <= today ? 0 : 1
}

/**
 * The board for one project. `rows` may hold every day's rows of the project;
 * only the rows of `templates` are read. `today` is the real current day, not
 * the day the list is showing, so the board does not change when the user
 * browses other days.
 *
 * Open columns sort overdue/today first, then upcoming, then undated; within
 * a date the task comes first in the order the list draws it. Done sorts by
 * completion time, newest first.
 */
export function buildBoardCards(
  rows: DailyTask[],
  templates: TaskTemplate[],
  today: ISODate,
  customIds: ReadonlyArray<string> = [],
): BoardCards {
  const templateIds = new Set(templates.map((item) => item.id))
  const drawnRank = new Map(
    sortTasks(templates).map((item, index) => [item.id, index]),
  )

  const rowsByTemplate = new Map<ID, DailyTask[]>()
  rows.forEach((row) => {
    if (!templateIds.has(row.templateId)) return
    const bucket = rowsByTemplate.get(row.templateId)
    if (bucket) bucket.push(row)
    else rowsByTemplate.set(row.templateId, [row])
  })

  const activeChildrenOf = new Map<ID, TaskTemplate[]>()
  templates.forEach((item) => {
    if (!item.isActive || !item.parentTemplateId) return
    if (!templateIds.has(item.parentTemplateId)) return
    const bucket = activeChildrenOf.get(item.parentTemplateId)
    if (bucket) bucket.push(item)
    else activeChildrenOf.set(item.parentTemplateId, [item])
  })

  const cards: BoardCards = { todo: [], doing: [], done: [] }
  customIds.forEach((id) => {
    cards[id] = []
  })

  templates.forEach((template) => {
    if (!template.isActive) return
    // A subtask is counted on its project's card, never shown on its own.
    if (
      template.parentTemplateId &&
      templateIds.has(template.parentTemplateId)
    ) {
      return
    }

    const repeating = isRepeating(template)
    const state = stateOf(
      template,
      rowsByTemplate.get(template.id) ?? [],
      today,
    )
    if (!repeating && !state.row) return
    if (state.done && isClearedFromBoard(template, state.completedAt)) return

    const children = activeChildrenOf.get(template.id) ?? []
    const childStates = children.map((child) =>
      stateOf(child, rowsByTemplate.get(child.id) ?? [], today),
    )

    const column = state.done
      ? BOARD_COLUMN.DONE
      : openColumnOf(template, customIds)

    cards[column].push({
      id: template.id,
      templateId: template.id,
      title: template.title,
      priority: template.priority,
      template,
      column,
      date: state.date,
      isRepeating: repeating,
      row: state.row,
      done: state.done,
      completedAt: state.completedAt,
      startTime: state.row?.startTime ?? template.startTime,
      canFinish: !repeating || state.date === today,
      childTemplateIds: children.map((child) => child.id),
      subtasksDone: childStates.filter((child) => child.done).length,
      subtasksTotal: children.length,
    })
  })

  const drawnFirst = (a: BoardCard, b: BoardCard) =>
    (drawnRank.get(a.templateId) ?? templates.length) -
    (drawnRank.get(b.templateId) ?? templates.length)

  const byDue = (a: BoardCard, b: BoardCard) => {
    const rank = dueRank(a, today) - dueRank(b, today)
    if (rank !== 0) return rank
    if (a.date && b.date && a.date !== b.date) {
      return a.date < b.date ? -1 : 1
    }
    return drawnFirst(a, b)
  }

  const byCompletion = (a: BoardCard, b: BoardCard) => {
    const left = a.completedAt ?? ''
    const right = b.completedAt ?? ''
    if (left !== right) return left > right ? -1 : 1
    return drawnFirst(a, b)
  }

  Object.entries(cards).forEach(([key, list]) => {
    list.sort(key === BOARD_COLUMN.DONE ? byCompletion : byDue)
  })

  return cards
}

export interface BoardMovePlan {
  /** Flip the card's done state, through the same action the checkbox uses. */
  toggleDone: boolean
  /**
   * The template's new stage. `null` means back to the default ("todo") and
   * `undefined` means leave the stage alone.
   */
  stage?: BoardStage | string | null
}

/**
 * What a drop or a "Move to" choice has to do. Finishing a repeating task
 * clears its stage (see `toggleTaskDone`), so the next occurrence starts in
 * To do. A one-off task keeps its stage, so un-finishing it returns it to
 * where it was. A repeating card whose day is not today cannot be finished
 * from the board.
 */
export function planBoardMove(
  card: BoardCard,
  column: BoardColumn,
): BoardMovePlan {
  if (column === BOARD_COLUMN.DONE) {
    if (!card.canFinish) return { toggleDone: false }
    return { toggleDone: !card.done }
  }

  return {
    toggleDone: card.done,
    stage: column === BOARD_COLUMN.TODO ? null : column,
  }
}

/**
 * The daily row a card's editor and menu work on. A card with no row today (a
 * repeating task whose next day is ahead) gets a stand-in for its day, so the
 * same editor can open on it.
 */
export function rowForCard(card: BoardCard, today: ISODate): DailyTask {
  if (card.row) return card.row
  const date = card.date ?? today
  return {
    id: dailyTaskId(card.templateId, date),
    date,
    templateId: card.templateId,
    title: card.title,
    priority: card.priority,
    goalId: card.template.goalId,
    tagIds: [],
    status: TASK_STATUS.TODO,
    startTime: card.startTime,
    endTime: card.template.endTime,
  }
}
