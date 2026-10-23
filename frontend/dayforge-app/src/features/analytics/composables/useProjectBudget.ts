import type { Ref } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { ID } from '../../../entities/types'
import { sameBudget, sanitizeBudget, type ProjectBudget } from './projectBudget'

/**
 * Writes a project's budget onto the live goals list. Only the `budget` key and
 * `updatedAt` change, so the sync sees a plain project edit.
 */
export function useProjectBudget(goals: Ref<Goal[]>) {
  function updateGoalBudget(goalId: ID, budget: ProjectBudget | undefined) {
    const goal = goals.value.find((item) => item.id === goalId)
    if (!goal) return

    const next = sanitizeBudget(budget)
    if (sameBudget(sanitizeBudget(goal.budget), next)) return

    if (next === undefined) {
      delete goal.budget
    } else {
      goal.budget = next
    }
    goal.updatedAt = new Date().toISOString()
  }

  return { updateGoalBudget }
}
