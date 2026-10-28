/** Dropping here takes a task out of whatever project it sits in. */
export const DROP_ZONE_ROOT = 'root'

export type DropHit = {
  /** Closest drop zone under the pointer: a project block, or the list root. */
  zone: string | null
  /** Closest draggable row under the pointer. */
  rowId: string | null
  /** The row is a project header, which an ordinary task is never placed beside. */
  rowIsProject: boolean
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
 * Which zone and row a drop means, given what is under the pointer. A project
 * is never nested in another one, so for a project every hit inside a block
 * counts as that whole block, and the zone is always the root.
 */
export function pickDropTarget(
  hit: DropHit,
  dragged: { id: string | null; isProject: boolean },
): DropTarget {
  const target = dragged.isProject ? projectTarget(hit) : taskTarget(hit)
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

function taskTarget(hit: DropHit): DropTarget {
  // A project header is not a row an ordinary task can go beside. The drop
  // falls back to the zone around it, as it always has.
  if (hit.rowIsProject) return { zone: hit.zone, rowId: null, isBlock: false }
  return { zone: hit.zone, rowId: hit.rowId, isBlock: false }
}
