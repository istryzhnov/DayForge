/** Compat checks: where a dropped task or project lands. */

import {
  DROP_ZONE_ROOT,
  pickDropTarget,
} from '../../../src/features/tasks/composables/dropRules'
import { check, same, section } from './harness'

export function verifyProjectDropTargets() {
  section('A project moves as one block, only among top-level rows')

  const project = { id: 'M', hasChildren: true }
  const task = { id: 'T', hasChildren: false }

  check(
    'project over a child of another project: the whole block, at root',
    same(
      pickDropTarget(
        { zone: 'P', rowId: 'child', rowHasChildren: false, rowCanNest: false },
        project,
      ),
      { zone: DROP_ZONE_ROOT, rowId: 'P', isBlock: true },
    ),
  )
  check(
    'project over a standalone row: that row, at root',
    same(
      pickDropTarget(
        {
          zone: DROP_ZONE_ROOT,
          rowId: 'S',
          rowHasChildren: false,
          rowCanNest: false,
        },
        project,
      ),
      { zone: DROP_ZONE_ROOT, rowId: 'S', isBlock: false },
    ),
  )
  check(
    'project over its own block: no target',
    same(
      pickDropTarget(
        {
          zone: 'M',
          rowId: 'M-child',
          rowHasChildren: false,
          rowCanNest: false,
        },
        project,
      ),
      { zone: DROP_ZONE_ROOT, rowId: null, isBlock: false },
    ),
  )
  check(
    'project over open list space: root, no row',
    same(
      pickDropTarget(
        {
          zone: DROP_ZONE_ROOT,
          rowId: null,
          rowHasChildren: false,
          rowCanNest: false,
        },
        project,
      ),
      { zone: DROP_ZONE_ROOT, rowId: null, isBlock: false },
    ),
  )

  section('An ordinary task keeps its own targets')

  check(
    'task over a child row: the row, in that project',
    same(
      pickDropTarget(
        { zone: 'P', rowId: 'child', rowHasChildren: false, rowCanNest: false },
        task,
      ),
      { zone: 'P', rowId: 'child', isBlock: false },
    ),
  )
  check(
    'task over a project header: no row, the header block zone',
    same(
      pickDropTarget(
        { zone: 'P', rowId: 'P', rowHasChildren: true, rowCanNest: false },
        task,
      ),
      {
        zone: 'P',
        rowId: null,
        isBlock: false,
      },
    ),
  )
  check(
    'task over a standalone project row: no row, root zone',
    same(
      pickDropTarget(
        {
          zone: DROP_ZONE_ROOT,
          rowId: 'M',
          rowHasChildren: true,
          rowCanNest: false,
        },
        task,
      ),
      { zone: DROP_ZONE_ROOT, rowId: null, isBlock: false },
    ),
  )
  check(
    'task over itself: no target',
    same(
      pickDropTarget(
        { zone: 'P', rowId: 'T', rowHasChildren: false, rowCanNest: false },
        task,
      ),
      {
        zone: 'P',
        rowId: null,
        isBlock: false,
      },
    ),
  )

  section('A task nests under a plain top-level row, in its middle band only')

  check(
    'task over the middle of a plain top-level row: nests under it',
    same(
      pickDropTarget(
        {
          zone: DROP_ZONE_ROOT,
          rowId: 'S',
          rowHasChildren: false,
          rowCanNest: true,
        },
        task,
      ),
      { zone: 'S', rowId: null, isBlock: false },
    ),
  )
  check(
    'task over the edge of a plain top-level row: beside it',
    same(
      pickDropTarget(
        {
          zone: DROP_ZONE_ROOT,
          rowId: 'S',
          rowHasChildren: false,
          rowCanNest: false,
        },
        task,
      ),
      { zone: DROP_ZONE_ROOT, rowId: 'S', isBlock: false },
    ),
  )
  check(
    'a parent over a plain top-level row: never nests, goes beside it',
    same(
      pickDropTarget(
        {
          zone: DROP_ZONE_ROOT,
          rowId: 'S',
          rowHasChildren: false,
          rowCanNest: true,
        },
        project,
      ),
      { zone: DROP_ZONE_ROOT, rowId: 'S', isBlock: false },
    ),
  )
  check(
    'task over itself in the middle band: no target',
    same(
      pickDropTarget(
        {
          zone: DROP_ZONE_ROOT,
          rowId: 'T',
          rowHasChildren: false,
          rowCanNest: true,
        },
        task,
      ),
      { zone: DROP_ZONE_ROOT, rowId: null, isBlock: false },
    ),
  )
}
