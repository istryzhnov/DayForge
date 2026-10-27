/** Compat checks: where a dragged project lands in the sidebar order. */

import { reorderedIds } from '../../../src/features/sidebar/composables/useGoalReorder'
import { check, same, section } from './harness'

export function verifyGoalReorder() {
  section('Project reorder lands where the drop line says')

  const ids = ['a', 'b', 'c', 'd']

  check(
    'moves down, dropped below the target',
    same(reorderedIds(ids, 'a', 'c', false), ['b', 'c', 'a', 'd']),
  )
  check(
    'moves up, dropped above the target',
    same(reorderedIds(ids, 'd', 'b', true), ['a', 'd', 'b', 'c']),
  )
  check(
    'next to its neighbour, below',
    same(reorderedIds(ids, 'a', 'b', false), ['b', 'a', 'c', 'd']),
  )
  check(
    'first project dropped above the first',
    same(reorderedIds(ids, 'c', 'a', true), ['c', 'a', 'b', 'd']),
  )
  check(
    'first project dropped below the last',
    same(reorderedIds(ids, 'a', 'd', false), ['b', 'c', 'd', 'a']),
  )
  check(
    'dropped onto itself keeps the order',
    same(reorderedIds(ids, 'b', 'b', true), ['a', 'b', 'c', 'd']),
  )
  check(
    'unknown target keeps the order',
    same(reorderedIds(ids, 'a', 'zz', true), ['a', 'b', 'c', 'd']),
  )
  check(
    'unknown project is not inserted',
    same(reorderedIds(ids, 'zz', 'a', true), ['a', 'b', 'c', 'd']),
  )
  check('input is not mutated', same(ids, ['a', 'b', 'c', 'd']))
}
