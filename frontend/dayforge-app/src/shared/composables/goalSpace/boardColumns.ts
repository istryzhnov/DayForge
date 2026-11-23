import type { BoardCustomColumn } from '../../../entities/GoalEntity'
import { BOARD_CUSTOM_COLUMN_LIMIT } from '../../../entities/constants'

/** Longest column name kept; anything past it is cut. */
export const BOARD_COLUMN_TITLE_MAX = 40

/**
 * The columns as stored: names trimmed and cut to length, nameless ones and
 * repeated ids dropped, at most `BOARD_CUSTOM_COLUMN_LIMIT` kept. An empty
 * list means "only the built-in columns".
 */
export function normalizeBoardColumns(
  columns: ReadonlyArray<BoardCustomColumn>,
): BoardCustomColumn[] {
  const seen = new Set<string>()
  const kept: BoardCustomColumn[] = []
  for (const column of columns) {
    const title = column.title.trim().slice(0, BOARD_COLUMN_TITLE_MAX)
    if (!column.id || !title || seen.has(column.id)) continue
    seen.add(column.id)
    kept.push({ id: column.id, title })
    if (kept.length === BOARD_CUSTOM_COLUMN_LIMIT) break
  }
  return kept
}

/** Ids that were in `before` and are gone from `after`. */
export function removedColumnIds(
  before: ReadonlyArray<BoardCustomColumn>,
  after: ReadonlyArray<BoardCustomColumn>,
): string[] {
  const kept = new Set(after.map((column) => column.id))
  return before.map((column) => column.id).filter((id) => !kept.has(id))
}
