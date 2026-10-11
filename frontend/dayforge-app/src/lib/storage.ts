import { watch, type Ref } from 'vue'

function store(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    return null
  }
}

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = store()?.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch (error) {
    console.error(`Could not read "${key}" from localStorage`, error)
    return fallback
  }
}

export function writeJson(key: string, value: unknown): boolean {
  try {
    const target = store()
    if (!target) throw new Error('localStorage is not available')
    target.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.error(`Could not write "${key}" to localStorage`, error)
    return false
  }
}

export function bindStorage<T>(refValue: Ref<T>, key: string) {
  watch(
    refValue,
    (nextValue) => {
      writeJson(key, nextValue)
    },
    { deep: true },
  )
}
