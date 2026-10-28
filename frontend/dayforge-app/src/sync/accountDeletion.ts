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

/**
 * The account that owns the data on this browser. It is written as soon as a
 * signed-in session is seen, so data left behind by an expired session still
 * says whose it is. It is not a device key, so sign-out and deletion remove it
 * with the rest of the account data.
 */
export const DATA_OWNER_STORAGE_KEY = 'dayforge-data-owner-v1'

/**
 * The Supabase session and its PKCE verifier. They are app keys like any other,
 * but a wipe before a new sign-in must keep them, or the new account would be
 * signed out again on reload.
 */
export const SESSION_KEY_PREFIX = 'dayforge-auth-v1'

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

function isSessionKey(key: string): boolean {
  return key.startsWith(SESSION_KEY_PREFIX)
}

/**
 * Removes this account's data and leaves DEVICE_KEYS alone. With `keepSession`
 * the auth session is kept too, for a wipe that precedes a new sign-in.
 * Returns how many keys were removed.
 */
export function clearAccountData(
  storage: KeyedStorage,
  keepSession = false,
): number {
  const keys = accountKeysToClear(appStorageKeys(storage)).filter(
    (key) => !(keepSession && isSessionKey(key)),
  )
  keys.forEach((key) => storage.removeItem(key))
  return keys.length
}

/**
 * Whether the data on this browser must be cleared before `userId` signs in.
 * Only a different owner counts: guest data (no owner recorded) is merged into
 * the first account that signs in, and the same account signing back in keeps
 * its data.
 */
export function shouldWipeBeforeSignIn(
  owner: string | null,
  userId: string,
): boolean {
  return owner !== null && owner !== userId
}

export function isDeleteConfirmed(typed: string): boolean {
  return typed.trim() === DELETE_CONFIRMATION
}
