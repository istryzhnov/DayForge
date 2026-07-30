import { watch, type Ref } from 'vue'
import type { Goal } from '../../entities/GoalEntity'
import type { DailyTask, TaskTemplate } from '../../entities/TaskEntity'
import type { ID } from '../../entities/types'

export const GOALS_STORAGE_KEY = 'dayforge-goals'
export const TASKS_STORAGE_KEY = 'dayforge-task-templates'
export const DAILY_TASKS_STORAGE_KEY = 'dayforge-daily-tasks'

export function loadJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key)
  if (!raw) return fallback

  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function bindStorage<T>(refValue: Ref<T>, key: string) {
  watch(
    refValue,
    (nextValue) => {
      localStorage.setItem(key, JSON.stringify(nextValue))
    },
    { deep: true },
  )
}

export type GoalStorage = {
  goals: Goal[]
  activeGoalId: ID | null
}

export type TaskStorage = {
  taskTemplates: TaskTemplate[]
  dailyTasks: DailyTask[]
}
