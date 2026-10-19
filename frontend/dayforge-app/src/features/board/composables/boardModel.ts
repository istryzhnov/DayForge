import type { DailyTask, TaskTemplate } from '../../../entities/TaskEntity'
import type { ID } from '../../../entities/types'
import {
  BOARD_STAGE,
  TASK_STATUS,
  type BoardStage,
} from '../../../entities/constants'
import { isRepeating } from '../../../composables/goalSpace/recurrence'

/**
 * Pure board rules, kept free of Vue so the sync harness can check them.
 *
 * A card is a daily row (what the list shows for the day), and its column is
 * decided by two things: the row's own done status, and the template's stage
 * for the open columns. Done is never stored as a stage.
 */

export const BOARD_COLUMN = {
  TODO: 'todo',
  DOING: 'doing',
  DONE: 'done',
} as const

export type BoardColumn = (typeof BOARD_COLUMN)[keyof typeof BOARD_COLUMN]

export const BOARD_COLUMNS: ReadonlyArray<{ key: BoardColumn; title: string }> =
  [
    { key: BOARD_COLUMN.TODO, title: 'To do' },
    { key: BOARD_COLUMN.DOING, title: 'In progress' },
    { key: BOARD_COLUMN.DONE, title: 'Done' },
  ]

export function isBoardColumn(value: unknown): value is BoardColumn {
  return (
    value === BOARD_COLUMN.TODO ||
    value === BOARD_COLUMN.DOING ||
    value === BOARD_COLUMN.DONE
  )
}

/** A missing or unrecognised stage counts as "todo". */
export function stageOf(template: TaskTemplate | undefined): BoardStage {
  return template?.boardStage === BOARD_STAGE.DOING
    ? BOARD_STAGE.DOING
    : BOARD_STAGE.TODO
}

export function columnOf(
  row: DailyTask,
  template: TaskTemplate | undefined,
): BoardColumn {
  if (row.status === TASK_STATUS.DONE) return BOARD_COLUMN.DONE
  return stageOf(template) === BOARD_STAGE.DOING
    ? BOARD_COLUMN.DOING
    : BOARD_COLUMN.TODO
}

export interface BoardCard {
  /** The daily row's id: what the existing toggle-done action takes. */
  id: ID
  templateId: ID
  row: DailyTask
  template?: TaskTemplate
  column: BoardColumn
  /** Rows nested under this card on the same day. */
  subtasksDone: number
  subtasksTotal: number
}

export type BoardCards = Record<BoardColumn, BoardCard[]>

/**
 * The cards for one project on one day. A row nested under another row of the
 * same day is shown as a count on its parent, exactly as the list nests it.
 * Within a column, cards follow the list's order: newest template first.
 */
export function buildBoardCards(
  rows: DailyTask[],
  templates: TaskTemplate[],
): BoardCards {
  const templateById = new Map(templates.map((item) => [item.id, item]))
  const orderRank = new Map(templates.map((item, index) => [item.id, index]))
  const rowIds = new Set(rows.map((row) => row.id))

  const childrenOf = new Map<ID, DailyTask[]>()
  rows.forEach((row) => {
    const parentId = row.parentDailyTaskId
    if (!parentId || !rowIds.has(parentId)) return
    childrenOf.set(parentId, [...(childrenOf.get(parentId) ?? []), row])
  })

  const cards: BoardCards = { todo: [], doing: [], done: [] }

  rows.forEach((row) => {
    if (row.parentDailyTaskId && rowIds.has(row.parentDailyTaskId)) return

    const template = templateById.get(row.templateId)
    if (template && !template.isActive) return

    const children = childrenOf.get(row.id) ?? []
    const column = columnOf(row, template)

    cards[column].push({
      id: row.id,
      templateId: row.templateId,
      row,
      template,
      column,
      subtasksDone: children.filter(
        (child) => child.status === TASK_STATUS.DONE,
      ).length,
      subtasksTotal: children.length,
    })
  })

  const newestFirst = (a: BoardCard, b: BoardCard) =>
    (orderRank.get(b.templateId) ?? -1) - (orderRank.get(a.templateId) ?? -1)
  cards.todo.sort(newestFirst)
  cards.doing.sort(newestFirst)
  cards.done.sort(newestFirst)

  return cards
}

export interface BoardMovePlan {
  /** Flip the row's done status, through the same action the checkbox uses. */
  toggleDone: boolean
  /**
   * The template's new stage. `null` means back to the default ("todo") and
   * `undefined` means leave the stage alone.
   */
  stage?: BoardStage | null
}

/**
 * What a drop or a "Move to" choice has to do. Finishing a repeating task
 * clears its stage, so the next occurrence starts in To do rather than
 * inheriting "In progress" from a day that is already over. A one-off task
 * keeps its stage, so un-finishing it returns it to where it was.
 */
export function planBoardMove(
  row: DailyTask,
  template: TaskTemplate | undefined,
  column: BoardColumn,
): BoardMovePlan {
  const isDone = row.status === TASK_STATUS.DONE

  if (column === BOARD_COLUMN.DONE) {
    const clearsStage =
      !isDone &&
      template !== undefined &&
      isRepeating(template) &&
      template.boardStage !== undefined
    return {
      toggleDone: !isDone,
      stage: clearsStage ? null : undefined,
    }
  }

  return {
    toggleDone: isDone,
    stage: column === BOARD_COLUMN.DOING ? BOARD_STAGE.DOING : null,
  }
}
