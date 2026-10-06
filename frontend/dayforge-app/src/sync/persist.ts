/**
 * localStorage, but safe to import where there isn't one — a private window
 * that refuses it, or the node process the sync logic is exercised in.
 */
function store(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    return null
  }
}

export function readJsonSafe<T>(key: string, fallback: T): T {
  const target = store()
  if (!target) return fallback

  try {
    const raw = target.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeJsonSafe(key: string, value: unknown): void {
  const target = store()
  if (!target) return

  try {
    target.setItem(key, JSON.stringify(value))
  } catch {
    // A full quota must not take the app down; the next write may succeed.
  }
}
