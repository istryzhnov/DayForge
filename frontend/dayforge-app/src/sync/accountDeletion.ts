/**
 * Everything the app keeps in localStorage is under this prefix, so a delete
 * can take it all without a list that might go stale.
 */
export const APP_STORAGE_PREFIX = 'dayforge-'

/** The word the user types to confirm. Case-sensitive on purpose. */
export const DELETE_CONFIRMATION = 'DELETE'

/**
 * Set in sessionStorage just before the page reloads after a deletion, so the
 * reloaded app can say so. sessionStorage is not cleared by the wipe below.
 */
export const ACCOUNT_DELETED_NOTICE_KEY = 'dayforge-account-deleted-notice-v1'

type KeyedStorage = Pick<Storage, 'length' | 'key' | 'removeItem'>

export function appStorageKeys(
  storage: Pick<Storage, 'length' | 'key'>,
): string[] {
  const keys: string[] = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key !== null && key.startsWith(APP_STORAGE_PREFIX)) keys.push(key)
  }
  return keys
}

/**
 * Removes every app key, including the auth session and the sync outbox, so
 * nothing from the deleted account can be sent or shown again. Returns how many
 * keys were removed.
 */
export function clearLocalAppData(storage: KeyedStorage): number {
  const keys = appStorageKeys(storage)
  keys.forEach((key) => storage.removeItem(key))
  return keys.length
}

/**
 * Keys that stay on the device when the user signs out. They describe this
 * browser, not an account, so the next account to sign in here does not
 * inherit anything from them:
 * - theme: the chosen look of the app.
 * - analytics-tab: which Analytics tab was open last.
 * - upcoming-collapsed: whether the Upcoming list is folded.
 * Every other app key is account data (tasks, goals, time, settings, the sync
 * queue, tips, timer) and is removed on sign-out.
 */
export const DEVICE_KEYS: readonly string[] = [
  'dayforge-theme-v1',
  'dayforge-analytics-tab',
  'dayforge-upcoming-collapsed-v1',
]

/** The app keys a sign-out removes: every prefixed key not in DEVICE_KEYS. */
export function accountKeysToClear(keys: readonly string[]): string[] {
  return keys.filter(
    (key) => key.startsWith(APP_STORAGE_PREFIX) && !DEVICE_KEYS.includes(key),
  )
}

/**
 * Removes this account's data on sign-out and leaves DEVICE_KEYS alone.
 * Returns how many keys were removed.
 */
export function clearAccountData(storage: KeyedStorage): number {
  const keys = accountKeysToClear(appStorageKeys(storage))
  keys.forEach((key) => storage.removeItem(key))
  return keys.length
}

export function isDeleteConfirmed(typed: string): boolean {
  return typed.trim() === DELETE_CONFIRMATION
}
