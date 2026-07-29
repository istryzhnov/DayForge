import { computed, ref } from 'vue'
import type { Goal } from '../entities/GoalEntity'
import type { ID } from '../entities/types'
import { loadJson, GOALS_STORAGE_KEY } from './goalSpace/storage'

export function useGoals() {
  const goals = ref<Goal[]>([])
  const activeGoalId = ref<ID | null>(null)

  const activeGoal = computed(() =>
    goals.value.find((goal) => goal.id === activeGoalId.value) ?? null,
  )

  function selectGoal(goalId: ID | null) {
    activeGoalId.value = goalId
  }

  function setGoals(nextGoals: Goal[]) {
    goals.value = nextGoals
  }

  function createGoal(goal: Goal) {
    goals.value.push(goal)
    if (activeGoalId.value === null) {
      activeGoalId.value = goal.id
    }
  }

  function loadFromStorage() {
    const storedGoals = loadJson<Goal[]>(GOALS_STORAGE_KEY, [])
    goals.value = storedGoals

    if (goals.value.length > 0 && activeGoalId.value === null) {
      activeGoalId.value = goals.value[0].id
    }
  }

  return {
    goals,
    activeGoalId,
    activeGoal,
    selectGoal,
    setGoals,
    createGoal,
    loadFromStorage,
  }
}
