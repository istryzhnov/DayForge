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

export function appStorageKeys(storage: Pick<Storage, 'length' | 'key'>): string[] {
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

export function isDeleteConfirmed(typed: string): boolean {
  return typed.trim() === DELETE_CONFIRMATION
}
