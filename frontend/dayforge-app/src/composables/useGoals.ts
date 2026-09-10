import { computed, ref, watch } from 'vue'
import type { Goal, GoalTheme } from '../entities/GoalEntity'
import type { GoalStatus, ID } from '../entities/types'
import { GOAL_STATUS } from '../entities/constants'
import { loadJson, GOALS_STORAGE_KEY } from './goalSpace/storage'
import { useSettings } from './useSettings'
import { useTombstones } from './useTombstones'
import { SYNC_TABLE, type SyncedRow } from '../sync/types'

export type GoalsStoragePayload = {
  goals: Goal[]
  activeGoalId: ID | null
}

export function useGoals() {
  const goals = ref<Goal[]>([])
  const activeGoalId = ref<ID | null>(null)
  const { bury, exhume, keepLive } = useTombstones()

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

  /**
   * The project is buried rather than dropped: another device must learn that
   * it went, instead of handing its copy back on the next sync.
   */
  function deleteGoal(goalId: ID) {
    const goal = goals.value.find((item) => item.id === goalId)
    if (goal) bury(SYNC_TABLE.GOALS, [goal as unknown as SyncedRow])

    goals.value = goals.value.filter((item) => item.id !== goalId)
    if (activeGoalId.value === goalId) {
      activeGoalId.value = null
    }
  }

  /** Lifts a burial and puts the project back, stamped as a current edit. */
  function restoreGoal(goalId: ID): Goal | null {
    const row = exhume(SYNC_TABLE.GOALS, goalId)
    if (!row) return null

    const goal = row as unknown as Goal
    goals.value = [...goals.value, goal]
    return goal
  }

  function updateGoalTheme(goalId: ID, theme: GoalTheme | undefined) {
    const goal = goals.value.find((item) => item.id === goalId)
    if (!goal) return
    goal.theme = theme && Object.keys(theme).length > 0 ? theme : undefined
    goal.updatedAt = new Date().toISOString()
  }

  /** The only way to rename a project after it was created. */
  function updateGoalDetails(goalId: ID, title: string, description: string) {
    const goal = goals.value.find((item) => item.id === goalId)
    if (!goal) return

    const nextTitle = title.trim()
    if (!nextTitle) return

    const nextDescription = description.trim()
    goal.title = nextTitle
    goal.description = nextDescription || undefined
    goal.updatedAt = new Date().toISOString()
  }

  function updateGoalStatus(goalId: ID, status: GoalStatus) {
    const goal = goals.value.find((item) => item.id === goalId)
    if (!goal || goal.status === status) return

    goal.status = status
    goal.updatedAt = new Date().toISOString()
  }

  /** An absent rate means "bill this project at the global rate". */
  function updateGoalRate(goalId: ID, hourlyRate: number | undefined) {
    const goal = goals.value.find((item) => item.id === goalId)
    if (!goal) return

    goal.hourlyRate = hourlyRate && hourlyRate > 0 ? hourlyRate : undefined
    goal.updatedAt = new Date().toISOString()
  }

  /** A buried copy never belongs in the list the sidebar reads. */
  function liveOnly(list: Goal[]): Goal[] {
    return keepLive(SYNC_TABLE.GOALS, list)
  }

  /** Goals coloured before per-project theming existed stored a bare hex. */
  function migrateGoals(list: Goal[]) {
    list.forEach((goal) => {
      if (goal.accentColor && !goal.theme) {
        goal.theme = { accent: goal.accentColor }
      }
      delete goal.accentColor
      if (!Object.values(GOAL_STATUS).includes(goal.status)) {
        goal.status = GOAL_STATUS.ACTIVE
      }
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
      migrateGoals(stored)
      goals.value = liveOnly(stored)
      selectInitialGoal()
      return
    }

    goals.value = liveOnly(stored.goals ?? [])
    migrateGoals(goals.value)
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
    restoreGoal,
    updateGoalDetails,
    updateGoalStatus,
    updateGoalTheme,
    updateGoalRate,
    loadFromStorage,
  }
}
