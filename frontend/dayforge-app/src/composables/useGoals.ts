import { computed, ref, watch } from 'vue'
import type { Goal } from '../entities/GoalEntity'
import type { ID } from '../entities/types'
import { loadJson, GOALS_STORAGE_KEY } from './goalSpace/storage'

type GoalsStoragePayload = {
  goals: Goal[]
  activeGoalId: ID | null
}

export function useGoals() {
  const goals = ref<Goal[]>([])
  const activeGoalId = ref<ID | null>(null)

  watch(
    [goals, activeGoalId],
    () => {
      const payload: GoalsStoragePayload = {
        goals: goals.value,
        activeGoalId: activeGoalId.value,
      }
      localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(payload))
    },
    { deep: true },
  )

  const activeGoal = computed(
    () => goals.value.find((goal) => goal.id === activeGoalId.value) ?? null,
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
    const stored = loadJson<GoalsStoragePayload | Goal[]>(GOALS_STORAGE_KEY, [])

    if (Array.isArray(stored)) {
      goals.value = stored
      if (goals.value.length > 0 && activeGoalId.value === null) {
        activeGoalId.value = goals.value[0].id
      }
      return
    }

    goals.value = stored.goals ?? []
    activeGoalId.value = stored.activeGoalId ?? null

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
