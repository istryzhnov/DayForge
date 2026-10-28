/** Compat checks: data left on the browser by another account is wiped before a new account signs in. */

import {
  clearAccountData,
  DATA_OWNER_STORAGE_KEY,
  shouldWipeBeforeSignIn,
} from '../../../src/sync/accountDeletion'
import { check, same, section } from './harness'

export function verifyAccountSwitchWipe() {
  section(
    'account switch: a different owner wipes, the same or no owner does not',
  )

  check(
    'no recorded owner (guest data) is merged, not wiped',
    shouldWipeBeforeSignIn(null, 'user-b') === false,
  )
  check(
    'the same account signing back in keeps its data',
    shouldWipeBeforeSignIn('user-a', 'user-a') === false,
  )
  check(
    'a different account wipes the previous owner data',
    shouldWipeBeforeSignIn('user-a', 'user-b') === true,
  )

  const keys = [
    'dayforge-theme-v1',
    'dayforge-goals',
    'dayforge-sync-outbox-v1',
    DATA_OWNER_STORAGE_KEY,
    'dayforge-auth-v1',
    'dayforge-auth-v1-code-verifier',
    'unrelated-key',
  ]
  const store = new Map<string, string>(keys.map((key) => [key, '"x"']))
  const storage = {
    get length() {
      return store.size
    },
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => {
      store.delete(key)
    },
  }

  clearAccountData(storage, true)
  check(
    'the owner record is removed with the account data',
    !store.has(DATA_OWNER_STORAGE_KEY),
  )
  check(
    'the session and its PKCE verifier survive the wipe',
    store.has('dayforge-auth-v1') &&
      store.has('dayforge-auth-v1-code-verifier'),
  )
  check(
    'device keys, the session and foreign keys survive the wipe',
    same(
      [...store.keys()].sort(),
      [
        'dayforge-auth-v1',
        'dayforge-auth-v1-code-verifier',
        'dayforge-theme-v1',
        'unrelated-key',
      ].sort(),
    ),
    [...store.keys()],
  )
}
