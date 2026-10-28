/** Compat checks: where a dropped task or project lands. */

import {
  DROP_ZONE_ROOT,
  pickDropTarget,
} from '../../../src/features/tasks/composables/dropRules'
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
