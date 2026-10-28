/** Compat checks: a queued delete yields to an edit made after it, and to nothing older. */

import { resolveQueuedDeletes } from '../../../src/sync/merge'
import { check, goalRow, same, section, T0, T1, T2 } from './harness'

export function verifyQueuedDeletes() {
  section(
    'queued deletes: a later remote edit revives the row, an older one does not',
  )

  const queued = new Map([['goal-a', T1]])

  const older = goalRow({ id: 'goal-a', updatedAt: T0 })
  const sameStamp = goalRow({ id: 'goal-a', updatedAt: T1 })
  const newer = goalRow({ id: 'goal-a', updatedAt: T2 })
  const untouched = goalRow({ id: 'goal-b', updatedAt: T2 })

  const stale = resolveQueuedDeletes([older], queued)
  check(
    'an older row stays deleted',
    same(stale.keep, []) && same(stale.revived, []),
    stale,
  )

  const tie = resolveQueuedDeletes([sameStamp], queued)
  check(
    'a row stamped exactly at the delete stays deleted',
    same(tie.keep, []) && same(tie.revived, []),
    tie,
  )

  const revive = resolveQueuedDeletes([newer], queued)
  check(
    'a row edited after the delete is kept and its delete is withdrawn',
    same(revive.keep, [newer]) && same(revive.revived, ['goal-a']),
    revive,
  )

  const mixed = resolveQueuedDeletes([older, untouched, newer], queued)
  check(
    'rows without a queued delete always pass through',
    same(mixed.keep, [untouched, newer]) && same(mixed.revived, ['goal-a']),
    mixed,
  )
}
