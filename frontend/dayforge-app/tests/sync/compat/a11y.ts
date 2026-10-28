/** Compat checks: keyboard focus rules for dialogs, menus and task moves. */

import {
  isTopmost,
  menuKeyTarget,
  trapTabTarget,
} from '../../../src/composables/focusRules'
import { planTaskNudge } from '../../../src/composables/goalSpace/taskOrder'
import { check, same, section } from './harness'

export function verifyFocusTrapTab() {
  section('Tab wraps inside a trapped dialog and never leaves it')

  check(
    'forward from the last control wraps to the first',
    trapTabTarget({ count: 3, index: 2, shift: false, inside: true }) === 0,
  )
  check(
    'backward from the first control wraps to the last',
    trapTabTarget({ count: 3, index: 0, shift: true, inside: true }) === 2,
  )
  check(
    'a middle control leaves Tab to the browser',
    trapTabTarget({ count: 3, index: 1, shift: false, inside: true }) === null,
  )
  check(
    'focus outside the dialog pulls forward Tab to the first control',
    trapTabTarget({ count: 3, index: -1, shift: false, inside: false }) === 0,
  )
  check(
    'focus outside the dialog pulls Shift+Tab to the last control',
    trapTabTarget({ count: 3, index: -1, shift: true, inside: false }) === 2,
  )
  check(
    'a single control keeps focus on itself in both directions',
    trapTabTarget({ count: 1, index: 0, shift: false, inside: true }) === 0 &&
      trapTabTarget({ count: 1, index: 0, shift: true, inside: true }) === 0,
  )
  check(
    'no focusable control: nothing to wrap to',
    trapTabTarget({ count: 0, index: -1, shift: false, inside: true }) === null,
  )
}

export function verifyStackedTraps() {
  section('Of stacked traps only the newest answers the keyboard')

  const stack = ['profile', 'delete-account']
  check(
    'the dialog opened last owns Escape and Tab',
    isTopmost(stack, 'delete-account'),
  )
  check(
    'the dialog underneath waits until the one above closes',
    !isTopmost(stack, 'profile'),
  )
  check(
    'once the top one is removed, the one below takes over',
    isTopmost(stack.slice(0, 1), 'profile'),
  )
  check('an empty stack owns nothing', !isTopmost([], 'profile'))
}

export function verifyMenuKeys() {
  section('Arrow keys move between menu entries and wrap at the ends')

  check(
    'ArrowDown from nothing focused starts at the first entry',
    menuKeyTarget('ArrowDown', -1, 4) === 0,
  )
  check(
    'ArrowUp from nothing focused starts at the last entry',
    menuKeyTarget('ArrowUp', -1, 4) === 3,
  )
  check(
    'ArrowDown from the last entry wraps to the first',
    menuKeyTarget('ArrowDown', 3, 4) === 0,
  )
  check(
    'ArrowUp from the first entry wraps to the last',
    menuKeyTarget('ArrowUp', 0, 4) === 3,
  )
  check(
    'Home and End jump to the ends',
    menuKeyTarget('Home', 2, 4) === 0 && menuKeyTarget('End', 1, 4) === 3,
  )
  check(
    'other keys are not menu keys',
    menuKeyTarget('Enter', 1, 4) === null && menuKeyTarget('a', 1, 4) === null,
  )
  check(
    'an empty menu has nowhere to go',
    menuKeyTarget('ArrowDown', -1, 0) === null,
  )
}

type NudgeRow = {
  id: string
  parentTemplateId?: string
  order?: number
  createdAt?: string
  deletedAt?: string
}

export function verifyTaskNudge() {
  section('A keyboard move up or down lands next to the visible neighbour')

  const rows: NudgeRow[] = [
    { id: 'A', order: 3, createdAt: '2026-10-01T00:00:00Z' },
    { id: 'B', order: 2, createdAt: '2026-10-01T00:00:00Z' },
    { id: 'C', order: 1, createdAt: '2026-10-01T00:00:00Z' },
    { id: 'P', order: 0, createdAt: '2026-10-01T00:00:00Z' },
    { id: 'c1', parentTemplateId: 'P', order: 2 },
    { id: 'c2', parentTemplateId: 'P', order: 1 },
  ]

  check(
    'up: the moved task goes above the row over it',
    same(planTaskNudge(rows, 'B', -1), { targetId: 'A', placeAbove: true }),
  )
  check(
    'down: the moved task goes below the row under it',
    same(planTaskNudge(rows, 'B', 1), { targetId: 'C', placeAbove: false }),
  )
  check('the top row cannot move up', planTaskNudge(rows, 'A', -1) === null)
  check(
    'a row moves down past its neighbour, to the bottom row',
    same(planTaskNudge(rows, 'C', 1), { targetId: 'P', placeAbove: false }),
  )
  check('the bottom row cannot move down', planTaskNudge(rows, 'P', 1) === null)
  check(
    'a subtask only moves among its own siblings',
    same(planTaskNudge(rows, 'c1', 1), { targetId: 'c2', placeAbove: false }) &&
      planTaskNudge(rows, 'c2', 1) === null,
  )

  const withGone: NudgeRow[] = [
    { id: 'A', order: 3 },
    { id: 'X', order: 2, deletedAt: '2026-10-02T00:00:00Z' },
    { id: 'B', order: 1 },
  ]
  check(
    'a deleted row is skipped, not landed next to',
    same(planTaskNudge(withGone, 'B', -1), { targetId: 'A', placeAbove: true }),
  )
  check(
    'an unknown task moves nowhere',
    planTaskNudge(rows, 'missing', -1) === null,
  )
}
