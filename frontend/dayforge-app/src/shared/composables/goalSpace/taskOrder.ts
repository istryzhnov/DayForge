/**
 * The order tasks are drawn in, stored on each row so every device agrees.
 * A higher number sits higher in the list. That is the direction `createTask`
 * has always written (each new task took the next number), so a list saved
 * before this field was used looks exactly as it did.
 */
export type TaskOrderRow = {
  id: string
  parentTemplateId?: string
  order?: number
}

/**
 * Tasks in the order they are drawn, top first. A row with no number goes last.
 * Rows that tie go newest first by creation time, which every device agrees
 * on (two tasks made offline on two devices can get the same number). Only
 * when that ties too does the stored position decide, the later one higher.
 */
export function sortTasks<T extends { order?: number; createdAt?: string }>(
  tasks: readonly T[],
): T[] {
  return tasks
    .map((task, index) => ({ task, index }))
    .sort((a, b) => {
      const left = a.task.order ?? Number.NEGATIVE_INFINITY
      const right = b.task.order ?? Number.NEGATIVE_INFINITY
      if (left !== right) return left > right ? -1 : 1
      const leftMade = a.task.createdAt ?? ''
      const rightMade = b.task.createdAt ?? ''
      if (leftMade !== rightMade) return leftMade > rightMade ? -1 : 1
      return b.index - a.index
    })
    .map(({ task }) => task)
}

/**
 * Before `order` was read, a dragged task moved inside the stored array and
 * the list was drawn from that position, later rows higher. This numbers each
 * list from its stored position so a list someone already arranged looks the
 * same after the update. Rows are numbered in place and not stamped: every
 * device does this once for its own copy, and nothing is sent.
 */
export function orderFromStoredPosition<T extends TaskOrderRow>(
  tasks: T[],
): void {
  const nextInList = new Map<string, number>()
  tasks.forEach((task) => {
    const list = task.parentTemplateId ?? ''
    const next = nextInList.get(list) ?? 0
    task.order = next
    nextInList.set(list, next + 1)
  })
}

/**
 * The row a keyboard "move up" or "move down" lands next to: the neighbour
 * among the task's visible siblings, in the order they are drawn. Null at
 * either end, or for a task that is not listed.
 */
export function planTaskNudge<T extends TaskOrderRow & { deletedAt?: string }>(
  templates: readonly T[],
  movedId: string,
  step: -1 | 1,
): { targetId: string; placeAbove: boolean } | null {
  const moved = templates.find((item) => item.id === movedId)
  if (!moved || moved.deletedAt) return null
  const parent = moved.parentTemplateId ?? null
  const siblings = sortTasks(
    templates.filter(
      (item) => !item.deletedAt && (item.parentTemplateId ?? null) === parent,
    ),
  )
  const index = siblings.indexOf(moved)
  const neighbour = index < 0 ? undefined : siblings[index + step]
  if (!neighbour) return null
  // Up: the moved task goes above the row over it. Down: below the row under it.
  return { targetId: neighbour.id, placeAbove: step < 0 }
}

/** A new task goes on top: one number above the highest in its list. */
export function nextTopOrder(siblings: readonly { order?: number }[]): number {
  let highest = -1
  siblings.forEach((task) => {
    if (task.order !== undefined && task.order > highest) highest = task.order
  })
  return highest + 1
}

/**
 * Moves one task above or below another in a list given in the order it is
 * drawn now (top first). The list is numbered again from the top down, so the
 * numbers stay tidy and sort the way they are drawn. Only rows whose number
 * changed are returned, so only those get stamped and sent to other devices.
 */
export function reorderSiblings<T extends { id: string; order?: number }>(
  siblings: readonly T[],
  movedId: string,
  targetId: string,
  placeAbove: boolean,
): { id: string; order: number }[] | null {
  if (movedId === targetId) return null

  const moved = siblings.find((item) => item.id === movedId)
  if (!moved) return null

  const rest = siblings.filter((item) => item.id !== movedId)
  const target = rest.findIndex((item) => item.id === targetId)
  if (target === -1) return null

  const next = [...rest]
  next.splice(placeAbove ? target : target + 1, 0, moved)

  const unchanged = next.every((item, index) => item.id === siblings[index].id)
  if (unchanged) return null

  const changes: { id: string; order: number }[] = []
  next.forEach((item, index) => {
    const order = next.length - 1 - index
    if (item.order !== order) changes.push({ id: item.id, order })
  })
  return changes
}

/**
 * The new numbers for dragging `movedId` beside `targetId`. The list is every
 * task under the target's parent (a project's subtasks, or the top level), so
 * the same list is numbered whichever goal the user is looking at. Returns null
 * when nothing would change or the two are not in the same list.
 */
export function planTaskReorder<T extends TaskOrderRow>(
  templates: readonly T[],
  movedId: string,
  targetId: string,
  placeAbove: boolean,
): { id: string; order: number }[] | null {
  const moved = templates.find((item) => item.id === movedId)
  const target = templates.find((item) => item.id === targetId)
  if (!moved || !target) return null

  const parent = target.parentTemplateId ?? null
  const siblings = templates.filter(
    (item) => (item.parentTemplateId ?? null) === parent,
  )
  if (!siblings.includes(moved)) return null

  return reorderSiblings(sortTasks(siblings), movedId, targetId, placeAbove)
}
