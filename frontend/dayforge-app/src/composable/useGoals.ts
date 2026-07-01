import { computed, ref, watch } from 'vue'
import type { Goal } from '../entities/GoalEntity'
import type { ID } from '../entities/types'

const GOALS_STORAGE_KEY = 'dayforge_goals'
const ACTIVE_GOAL_STORAGE_KEY = 'dayforge_active_goal'

export function useGoals() {
  const goals = ref<Goal[]>([])
  const activeGoalId = ref<ID | null>(null)

  const activeGoal = computed(
    () => goals.value.find((goal) => goal.id === activeGoalId.value) ?? null,
  )

  //download from storage before initializing the app, so that the user can see the goals immediately
  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(GOALS_STORAGE_KEY)
      if (stored) {
        goals.value = JSON.parse(stored)
      }

      const storedActiveId = localStorage.getItem(ACTIVE_GOAL_STORAGE_KEY)
      if (storedActiveId) {
        activeGoalId.value = storedActiveId
      }
    } catch (e) {
      console.error('Failed to load goals from storage:', e)
    }
  }

  //save goals if changed
  watch(
    () => goals.value,
    (newGoals) => {
      localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(newGoals))
    },
    { deep: true },
  )

  //save activeGoalId if changed
  watch(
    () => activeGoalId.value,
    (newId) => {
      if (newId) {
        localStorage.setItem(ACTIVE_GOAL_STORAGE_KEY, newId)
      } else {
        localStorage.removeItem(ACTIVE_GOAL_STORAGE_KEY)
      }
    },
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
    loadFromStorage,
  }
}
