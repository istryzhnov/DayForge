import { computed, ref, watch } from 'vue'
import type { Goal, GoalTheme } from '../entities/GoalEntity'
import type { GoalStatus, ID } from '../entities/types'
import { migrateGoals } from './goalSpace/goalMigration'
import { normalizeNotes } from './goalSpace/notes'
import { GOALS_STORAGE_KEY } from './goalSpace/storage'
import { readJson, writeJson } from '../lib/storage'
import { START_VIEW, useSettings } from './useSettings'
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
      writeJson(GOALS_STORAGE_KEY, payload)
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

  /** An absent icon means the project shows no icon. */
  function updateGoalIcon(goalId: ID, icon: string | undefined) {
    const goal = goals.value.find((item) => item.id === goalId)
    if (!goal) return

    goal.icon = icon || undefined
    goal.updatedAt = new Date().toISOString()
  }

  /** Off is stored as an absent flag, so a project that never had it is unchanged. */
  function updateGoalBoard(goalId: ID, enabled: boolean) {
    const goal = goals.value.find((item) => item.id === goalId)
    if (!goal || (goal.boardEnabled === true) === enabled) return

    if (enabled) {
      goal.boardEnabled = true
    } else {
      delete goal.boardEnabled
    }
    goal.updatedAt = new Date().toISOString()
  }

  /** Blank notes remove the field, so a project without notes stays unchanged. */
  function updateGoalNotes(goalId: ID, notes: string) {
    const goal = goals.value.find((item) => item.id === goalId)
    if (!goal) return

    const next = normalizeNotes(notes)
    if (next === goal.notes) return

    if (next === undefined) {
      delete goal.notes
    } else {
      goal.notes = next
    }
    goal.updatedAt = new Date().toISOString()
  }

  /** An absent rate means "bill this project at the global rate". */
  function updateGoalRate(goalId: ID, hourlyRate: number | undefined) {
    const goal = goals.value.find((item) => item.id === goalId)
    if (!goal) return

    goal.hourlyRate = hourlyRate && hourlyRate > 0 ? hourlyRate : undefined
    goal.updatedAt = new Date().toISOString()
  }

  /** Absent means the project bills to no client. */
  function updateGoalClient(goalId: ID, clientId: ID | undefined) {
    const goal = goals.value.find((item) => item.id === goalId)
    if (!goal || goal.clientId === clientId) return

    if (clientId === undefined) {
      delete goal.clientId
    } else {
      goal.clientId = clientId
    }
    goal.updatedAt = new Date().toISOString()
  }

  /** A buried copy never belongs in the list the sidebar reads. */
  function liveOnly(list: Goal[]): Goal[] {
    return keepLive(SYNC_TABLE.GOALS, list)
  }

  /**
   * A fresh load opens on what the settings name: All Tasks unless a project
   * is picked there. The project open last time is not brought back.
   */
  function selectInitialGoal() {
    const { startView, startGoalId } = useSettings().settings.behavior
    activeGoalId.value =
      startView === START_VIEW.GOALS &&
      goals.value.some((goal) => goal.id === startGoalId)
        ? startGoalId
        : null
  }

  function loadFromStorage() {
    const stored = readJson<GoalsStoragePayload | Goal[]>(GOALS_STORAGE_KEY, [])
    const list = Array.isArray(stored) ? stored : (stored.goals ?? [])

    goals.value = liveOnly(list)
    migrateGoals(goals.value)
    selectInitialGoal()
  }

  /**
   * Puts the given projects first, in that order, and numbers them. Only the
   * ones whose place changed are stamped, so a sync carries the move along.
   */
  function reorderGoals(orderedIds: ID[]) {
    const now = new Date().toISOString()
    orderedIds.forEach((id, index) => {
      const goal = goals.value.find((item) => item.id === id)
      if (!goal || goal.order === index) return
      goal.order = index
      goal.updatedAt = now
    })
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
    updateGoalClient,
    updateGoalIcon,
    updateGoalBoard,
    updateGoalNotes,
    reorderGoals,
    loadFromStorage,
  }
}
