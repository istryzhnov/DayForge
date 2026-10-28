/** Compat checks: where a dropped task or project lands, and how a list reorders. */

import {
  DROP_ZONE_ROOT,
  pickDropTarget,
} from '../../../src/features/tasks/composables/dropRules'
import { placeBeside } from '../../../src/composables/goalSpace/taskOrder'
import { check, same, section } from './harness'

export function verifyProjectDropTargets() {
  section('A project moves as one block, only among top-level rows')

  const project = { id: 'M', isProject: true }
  const task = { id: 'T', isProject: false }

  check(
    'project over a child of another project: the whole block, at root',
    same(
      pickDropTarget(
        { zone: 'P', rowId: 'child', rowIsProject: false },
        project,
      ),
      { zone: DROP_ZONE_ROOT, rowId: 'P', isBlock: true },
    ),
  )
  check(
    'project over a standalone row: that row, at root',
    same(
      pickDropTarget(
        { zone: DROP_ZONE_ROOT, rowId: 'S', rowIsProject: false },
        project,
      ),
      { zone: DROP_ZONE_ROOT, rowId: 'S', isBlock: false },
    ),
  )
  check(
    'project over its own block: no target',
    same(
      pickDropTarget(
        { zone: 'M', rowId: 'M-child', rowIsProject: false },
        project,
      ),
      { zone: DROP_ZONE_ROOT, rowId: null, isBlock: false },
    ),
  )
  check(
    'project over open list space: root, no row',
    same(
      pickDropTarget(
        { zone: DROP_ZONE_ROOT, rowId: null, rowIsProject: false },
        project,
      ),
      { zone: DROP_ZONE_ROOT, rowId: null, isBlock: false },
    ),
  )

  section('An ordinary task keeps its own targets')

  check(
    'task over a child row: the row, in that project',
    same(
      pickDropTarget({ zone: 'P', rowId: 'child', rowIsProject: false }, task),
      { zone: 'P', rowId: 'child', isBlock: false },
    ),
  )
  check(
    'task over a project header: no row, the header block zone',
    same(pickDropTarget({ zone: 'P', rowId: 'P', rowIsProject: true }, task), {
      zone: 'P',
      rowId: null,
      isBlock: false,
    }),
  )
  check(
    'task over a standalone project row: no row, root zone',
    same(
      pickDropTarget(
        { zone: DROP_ZONE_ROOT, rowId: 'M', rowIsProject: true },
        task,
      ),
      { zone: DROP_ZONE_ROOT, rowId: null, isBlock: false },
    ),
  )
  check(
    'task over itself: no target',
    same(pickDropTarget({ zone: 'P', rowId: 'T', rowIsProject: false }, task), {
      zone: 'P',
      rowId: null,
      isBlock: false,
    }),
  )
}

export function verifyPlaceBeside() {
  section('Reordering keeps the drawn order: newest first in the list')

  const list = ['a', 'b', 'c', 'd'].map((id) => ({ id }))
  const ids = (result: { id: string }[] | null) =>
    result?.map((item) => item.id) ?? null

  check(
    'dropped above c: lands after it in storage',
    same(ids(placeBeside(list, 'a', 'c', true)), ['b', 'c', 'a', 'd']),
  )
  check(
    'dropped below b: lands before it in storage',
    same(ids(placeBeside(list, 'd', 'b', false)), ['a', 'd', 'b', 'c']),
  )
  check(
    'already in place: nothing changes',
    placeBeside(list, 'b', 'a', true) === null,
  )
  check(
    'onto itself: nothing changes',
    placeBeside(list, 'a', 'a', true) === null,
  )
  check(
    'unknown target: nothing changes',
    placeBeside(list, 'a', 'zz', true) === null,
  )
}
