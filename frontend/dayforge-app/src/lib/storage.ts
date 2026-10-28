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

/**
 * Writes only when the stored text would change. A write from another tab
 * reaches this tab's watcher as an ordinary change; writing the same text back
 * would make that tab write again, and two tabs could keep passing a value
 * between them.
 */
export function writeJsonIfChanged(key: string, value: unknown): boolean {
  try {
    const target = store()
    if (!target) throw new Error('localStorage is not available')
    const raw = JSON.stringify(value)
    if (target.getItem(key) !== raw) target.setItem(key, raw)
    return true
  } catch (error) {
    console.error(`Could not write "${key}" to localStorage`, error)
    return false
  }
}

/**
 * Parses text another tab wrote. Junk gives undefined, so the caller can leave
 * its own copy alone rather than replace it with nothing.
 */
export function parseStored(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return undefined
  }
}

/**
 * Calls `onWrite` with the new text when another tab writes `key`. The browser
 * reports only writes made in other tabs, so this tab never hears its own.
 */
export function onExternalWrite(
  key: string,
  onWrite: (raw: string) => void,
): void {
  if (typeof window === 'undefined') return
  window.addEventListener('storage', (event) => {
    if (event.key === key && event.newValue !== null) onWrite(event.newValue)
  })
}

export function bindStorage<T>(refValue: Ref<T>, key: string) {
  watch(
    refValue,
    (nextValue) => {
      writeJsonIfChanged(key, nextValue)
    },
    { deep: true },
  )
}
