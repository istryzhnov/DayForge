import type { Goal } from '../../entities/GoalEntity'

/**
 * Projects in the order the user dragged them into. One never moved has no
 * number and goes after the rest, oldest first, which is the old order.
 */
export function sortGoals(goals: readonly Goal[]): Goal[] {
  return [...goals].sort((a, b) => {
    const left = a.order ?? Number.POSITIVE_INFINITY
    const right = b.order ?? Number.POSITIVE_INFINITY
    if (left !== right) return left < right ? -1 : 1
    return a.createdAt.localeCompare(b.createdAt)
  })
}
