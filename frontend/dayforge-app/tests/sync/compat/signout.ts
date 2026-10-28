/** Compat checks: which local keys a sign-out removes, and which stay on the device. */

import {
  accountKeysToClear,
  clearAccountData,
  DEVICE_KEYS,
} from '../../../src/sync/accountDeletion'
import { check, same, section } from './harness'

export function verifySignOutKeySelection() {
  section('sign-out: which local keys are removed')

  const keys = [
    'dayforge-theme-v1',
    'dayforge-analytics-tab',
    'dayforge-upcoming-collapsed-v1',
    'dayforge-goals',
    'dayforge-settings-v1',
    'dayforge-sync-outbox-v1',
    'dayforge-sync-meta-v1',
    'dayforge-tombstones-v1',
    'dayforge-timer-active-v1',
    'dayforge-coach-tips-v1',
    'dayforge-auth-v1',
    'unrelated-key',
  ]

  const removed = accountKeysToClear(keys)
  check(
    'account data and the auth session are removed',
    same(removed.includes('dayforge-goals'), true) &&
      same(removed.includes('dayforge-sync-outbox-v1'), true) &&
      same(removed.includes('dayforge-auth-v1'), true) &&
      same(removed.includes('dayforge-coach-tips-v1'), true),
    removed,
  )
  check(
    'device preferences are kept',
    DEVICE_KEYS.every((key) => !removed.includes(key)),
    removed,
  )
  check(
    'keys outside the app prefix are never touched',
    !removed.includes('unrelated-key'),
  )
  check(
    'every prefixed key that is not a device key is removed',
    same(
      removed.sort(),
      [
        'dayforge-auth-v1',
        'dayforge-coach-tips-v1',
        'dayforge-goals',
        'dayforge-settings-v1',
        'dayforge-sync-meta-v1',
        'dayforge-sync-outbox-v1',
        'dayforge-timer-active-v1',
        'dayforge-tombstones-v1',
      ].sort(),
    ),
    removed,
  )

  const store = new Map<string, string>(keys.map((key) => [key, '{}']))
  const storage = {
    get length() {
      return store.size
    },
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => {
      store.delete(key)
    },
  }

  const count = clearAccountData(storage)
  check('reports how many keys it removed', count === removed.length, count)
  check(
    'leaves only device keys and foreign keys in storage',
    same([...store.keys()].sort(), ['unrelated-key', ...DEVICE_KEYS].sort()),
    [...store.keys()],
  )
  check('a second sign-out removes nothing', clearAccountData(storage) === 0)
}
