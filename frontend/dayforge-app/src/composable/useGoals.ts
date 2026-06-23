import { computed, ref } from 'vue'
import type { Goal } from '../entities/GoalEntity'
import type { ID } from '../entities/types'

export function useGoals() {
  const goals = ref<Goal[]>([])
  const activeGoalId = ref<ID | null>(null)

  const activeGoal = computed(
    () => goals.value.find((goal) => goal.id === activeGoalId.value) ?? null,
  )

  function selectGoal(goalId: ID | null) {
    activeGoalId.value = goalId
  }

  function setGoals(nextGoals: Goal[]) {
    goals.value = nextGoals
    if (
      activeGoalId.value &&
      !nextGoals.some((goal) => goal.id === activeGoalId.value)
    ) {
      activeGoalId.value = null
    }
  }

  function createGoal(goal: Goal) {
    goals.value.push(goal)
    activeGoalId.value = goal.id
  }

  return {
    goals,
    activeGoalId,
    activeGoal,
    selectGoal,
    setGoals,
    createGoal,
  }
}
