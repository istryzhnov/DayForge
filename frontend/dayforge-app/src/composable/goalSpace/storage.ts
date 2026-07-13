import { watch, type Ref } from 'vue'

export const TASKS_STORAGE_KEY = 'dayforge_tasks'
export const DAILY_TASKS_STORAGE_KEY = 'dayforge_daily_tasks'

export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch (error) {
    console.error(`Failed to load ${key}:`, error)
    return fallback
  }
}

export function bindStorage<T>(source: Ref<T>, key: string) {
  watch(
    source,
    (value) => {
      localStorage.setItem(key, JSON.stringify(value))
    },
    { deep: true },
  )
}
