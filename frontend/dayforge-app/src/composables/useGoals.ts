import { computed, ref, watch } from 'vue'
import type { Goal, GoalTheme } from '../entities/GoalEntity'
import type { ID } from '../entities/types'
import { loadJson, GOALS_STORAGE_KEY } from './goalSpace/storage'
import { useSettings } from './useSettings'

export type GoalsStoragePayload = {
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

  function deleteGoal(goalId: ID) {
    goals.value = goals.value.filter((goal) => goal.id !== goalId)
    if (activeGoalId.value === goalId) {
      activeGoalId.value = null
    }
  }

  function updateGoalTheme(goalId: ID, theme: GoalTheme | undefined) {
    const goal = goals.value.find((item) => item.id === goalId)
    if (!goal) return
    goal.theme = theme && Object.keys(theme).length > 0 ? theme : undefined
    goal.updatedAt = new Date().toISOString()
  }

  function updateGoalColor(goalId: ID, accentColor: string | undefined) {
    const goal = goals.value.find((item) => item.id === goalId)
    if (!goal) return
    updateGoalTheme(
      goalId,
      accentColor ? { ...goal.theme, accent: accentColor } : undefined,
    )
  }

  /** Goals coloured before per-project theming existed stored a bare hex. */
  function migrateGoalThemes(list: Goal[]) {
    list.forEach((goal) => {
      if (goal.accentColor && !goal.theme) {
        goal.theme = { accent: goal.accentColor }
      }
      delete goal.accentColor
    })
  }

  function selectInitialGoal() {
    if (activeGoalId.value !== null) return
    if (!useSettings().settings.behavior.autoSelectFirstGoal) return
    if (goals.value.length === 0) return
    activeGoalId.value = goals.value[0].id
  }

  function loadFromStorage() {
    const stored = loadJson<GoalsStoragePayload | Goal[]>(GOALS_STORAGE_KEY, [])

    if (Array.isArray(stored)) {
      migrateGoalThemes(stored)
      goals.value = stored
      selectInitialGoal()
      return
    }

    goals.value = stored.goals ?? []
    migrateGoalThemes(goals.value)
    activeGoalId.value = stored.activeGoalId ?? null
    selectInitialGoal()
  }

  return {
    goals,
    activeGoalId,
    activeGoal,
    selectGoal,
    setGoals,
    createGoal,
    deleteGoal,
    updateGoalColor,
    updateGoalTheme,
    loadFromStorage,
  }
}
