import type { Ref } from 'vue'
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
  refValue.value = loadJson<T>(key, refValue.value)

  refValue.value = new Proxy(refValue.value as object, {
    set(target, property, value) {
      ;(target as Record<string, unknown>)[property as string] = value
      localStorage.setItem(key, JSON.stringify(target))
      return true
    },
  }) as T
}

export type GoalStorage = {
  goals: Goal[]
  activeGoalId: ID | null
}

export type TaskStorage = {
  taskTemplates: TaskTemplate[]
  dailyTasks: DailyTask[]
}
