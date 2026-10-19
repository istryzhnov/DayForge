import type { Ref } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { ID } from '../../../entities/types'
import {
  sameBilling,
  sanitizeBilling,
  type ProjectBilling,
} from './projectBilling'

/**
 * Writes analytics figures onto a project inside the live goals list. Only the
 * `billing` key and `updatedAt` change, so the sync sees a plain project edit.
 */
export function useProjectBilling(goals: Ref<Goal[]>) {
  function updateGoalBilling(goalId: ID, billing: ProjectBilling | undefined) {
    const goal = goals.value.find((item) => item.id === goalId)
    if (!goal) return

    const next = sanitizeBilling(billing)
    if (sameBilling(goal.billing, next)) return

    if (next === undefined) {
      delete goal.billing
    } else {
      goal.billing = next
    }
    goal.updatedAt = new Date().toISOString()
  }

  return { updateGoalBilling }
}
