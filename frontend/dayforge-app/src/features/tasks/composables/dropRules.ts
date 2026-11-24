/** Dropping here takes a task out of whatever project it sits in. */
export const DROP_ZONE_ROOT = 'root'

export type DropHit = {
  /** Closest drop zone under the pointer: a project block, or the list root. */
  zone: string | null
  /** Closest draggable row under the pointer. */
  rowId: string | null
  /** The row has children (a project header), so a task dropped on it goes into it. */
  rowHasChildren: boolean
  /**
   * The row is a top-level task with no children, and the pointer is over its
   * middle, so a task dropped there nests under it. Edges still reorder.
   */
  rowCanNest: boolean
}

export type DropTarget = {
  /** Where the dropped task ends up: a project id, or the root. */
  zone: string | null
  /** Row the task lands next to, when there is one. */
  rowId: string | null
  /** The hit was a whole project block, so the drop line goes around the block. */
  isBlock: boolean
}

/**
 * Which zone and row a drop means, given what is under the pointer. A task
 * with children is never filed under another one, so for such a task every hit
 * inside a block counts as that whole block, and the zone is always the root.
 */
export function pickDropTarget(
  hit: DropHit,
  dragged: { id: string | null; hasChildren: boolean },
): DropTarget {
  const target = dragged.hasChildren
    ? projectTarget(hit)
    : taskTarget(hit, dragged.id)
  if (target.rowId !== null && target.rowId === dragged.id) {
    return { ...target, rowId: null, isBlock: false }
  }
  return target
}

function projectTarget(hit: DropHit): DropTarget {
  const inBlock = hit.zone !== null && hit.zone !== DROP_ZONE_ROOT
  if (inBlock) return { zone: DROP_ZONE_ROOT, rowId: hit.zone, isBlock: true }
  return { zone: DROP_ZONE_ROOT, rowId: hit.rowId, isBlock: false }
}

function taskTarget(hit: DropHit, draggedId: string | null): DropTarget {
  // A project header is not a row an ordinary task can go beside. The drop
  // falls back to the zone around it, as it always has.
  if (hit.rowHasChildren) return { zone: hit.zone, rowId: null, isBlock: false }
  // Over the middle of a plain top-level row: the task nests under that row,
  // which becomes a project. Dropping a row onto itself is never a nest.
  if (hit.rowCanNest && hit.rowId !== null && hit.rowId !== draggedId) {
    return { zone: hit.rowId, rowId: null, isBlock: false }
  }
  return { zone: hit.zone, rowId: hit.rowId, isBlock: false }
}
