import type { ID } from '../../../entities/types'

/**
 * The ids that other items name as their parent. Subtask templates and day rows
 * both nest through a parent id, so an item is a parent exactly when some other
 * item in the same list points at it. Priority plays no part: "Important" is
 * only a mark, and nesting must not depend on it.
 */
export function referencedParentIds<T>(
  items: readonly T[],
  parentIdOf: (item: T) => ID | undefined,
): Set<ID> {
  const ids = new Set<ID>()
  items.forEach((item) => {
    const parentId = parentIdOf(item)
    if (parentId) ids.add(parentId)
  })
  return ids
}
