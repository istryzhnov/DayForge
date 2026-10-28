/** Compat checks: task order is a row field, so every device draws the same list. */

import { mergeCollection } from '../../../src/sync/merge'
import { SYNC_TABLE, type SyncedRow } from '../../../src/sync/types'
import {
  nextTopOrder,
  planTaskReorder,
  reorderSiblings,
  sortTasks,
} from '../../../src/composables/goalSpace/taskOrder'
import { check, clone, same, section, T0, T2 } from './harness'

type TestRow = {
  id: string
  title: string
  goalId?: string
  parentTemplateId?: string
  order?: number
  createdAt: string
  updatedAt: string
}

function row(
  id: string,
  order: number | undefined,
  overrides: Partial<TestRow> = {},
): TestRow {
  return {
    id,
    title: id,
    order,
    createdAt: T0,
    updatedAt: T0,
    ...overrides,
  }
}

const idsOf = (rows: readonly { id: string }[]) => rows.map((item) => item.id)

export function verifyTaskOrder() {
  section('Lists saved before order existed look exactly as before')

  // Stored oldest first and drawn newest first, as every list has been so far.
  const legacy = [row('a', 0), row('b', 1), row('c', 2), row('d', 3)]
  check(
    'counts written at creation: the newest task is on top',
    same(idsOf(sortTasks(legacy)), ['d', 'c', 'b', 'a']),
  )
  check(
    'a row with no number goes last, among the others newest first',
    same(idsOf(sortTasks([row('m1', undefined), row('a', 0), row('b', 1)])), [
      'b',
      'a',
      'm1',
    ]),
  )
  check(
    'rows with equal numbers keep the stored order, later one higher',
    same(idsOf(sortTasks([row('x', 1), row('y', 1)])), ['y', 'x']),
  )
  check(
    'sorting does not reorder the stored array',
    same(idsOf(legacy), ['a', 'b', 'c', 'd']),
  )

  section('A new task goes on top')

  check('first task in an empty list', nextTopOrder([]) === 0)
  check(
    'one above the highest number',
    nextTopOrder([row('a', 0), row('b', 2)]) === 3,
  )
  check(
    'rows with no number are ignored',
    nextTopOrder([row('m1', undefined), row('a', 4)]) === 5,
  )
  const withNew = [...legacy, row('new', nextTopOrder(legacy))]
  check(
    'a new task is drawn above every older one',
    sortTasks(withNew)[0].id === 'new',
  )

  section('Reordering renumbers the list from the top down')

  // Drawn top first: a is highest.
  const drawn = [row('a', 3), row('b', 2), row('c', 1), row('d', 0)]

  check(
    'dropped below c: only the rows that moved are numbered',
    same(reorderSiblings(drawn, 'a', 'c', false), [
      { id: 'b', order: 3 },
      { id: 'c', order: 2 },
      { id: 'a', order: 1 },
    ]),
  )
  check(
    'dropped above c: b and a swap, c and d keep their numbers',
    same(reorderSiblings(drawn, 'a', 'c', true), [
      { id: 'b', order: 3 },
      { id: 'a', order: 2 },
    ]),
  )
  check(
    'a row dropped above b moves to the top half',
    same(reorderSiblings(drawn, 'd', 'b', true), [
      { id: 'd', order: 2 },
      { id: 'b', order: 1 },
      { id: 'c', order: 0 },
    ]),
  )
  check(
    'already in place: nothing is stamped',
    reorderSiblings(drawn, 'b', 'a', false) === null,
  )
  check(
    'onto itself: nothing is stamped',
    reorderSiblings(drawn, 'a', 'a', true) === null,
  )
  check(
    'unknown target: nothing is stamped',
    reorderSiblings(drawn, 'a', 'zz', true) === null,
  )
  check(
    'unknown task: nothing is stamped',
    reorderSiblings(drawn, 'zz', 'a', true) === null,
  )
  check('the input is not mutated', same(idsOf(drawn), ['a', 'b', 'c', 'd']))

  section('Reordering works within one parent, across the goals in view')

  const tasks = [
    row('a', 0, { goalId: 'g1' }),
    row('b', 1, { goalId: 'g2' }),
    row('c', 2, { goalId: 'g1' }),
    row('s1', 0, { parentTemplateId: 'a', goalId: 'g1' }),
    row('s2', 1, { parentTemplateId: 'a', goalId: 'g1' }),
    row('s3', 2, { parentTemplateId: 'a', goalId: 'g1' }),
  ]

  check(
    'top level: the other project keeps its place in the same list',
    same(
      planTaskReorder(tasks, 'c', 'a', false)?.map((change) => change.id),
      ['b', 'a', 'c'],
    ),
  )
  check(
    'subtasks: moved above a sibling, only inside their project',
    same(planTaskReorder(tasks, 's1', 's3', true), [
      { id: 's1', order: 2 },
      { id: 's3', order: 1 },
      { id: 's2', order: 0 },
    ]),
  )
  check(
    'a task cannot be dropped beside a row in another list',
    planTaskReorder(tasks, 's1', 'b', false) === null,
  )

  section('Two devices end up drawing the same list')

  // Device A drags a above c. Device B still holds the old numbers, in a
  // different array order, and merges A's rows in over the next sync.
  const deviceA = [row('a', 0), row('b', 1), row('c', 2), row('d', 3)]
  const changes = planTaskReorder(deviceA, 'a', 'c', true) ?? []
  changes.forEach(({ id, order }) => {
    const item = deviceA.find((task) => task.id === id)
    if (!item) return
    item.order = order
    item.updatedAt = T2
  })
  const deviceAList = sortTasks(deviceA)

  check(
    'the drag stamps only the rows whose number changed',
    same(
      changes.map((change) => change.id),
      ['a', 'c', 'b'],
    ) && deviceA.find((task) => task.id === 'd')?.updatedAt === T0,
  )

  const deviceB = clone([row('d', 3), row('c', 2), row('b', 1), row('a', 0)])
  const merged = mergeCollection(
    SYNC_TABLE.TASK_TEMPLATES,
    deviceB as unknown as SyncedRow[],
    clone(deviceA) as unknown as SyncedRow[],
  ).merged as unknown as TestRow[]

  check(
    'device B, after merging A, draws the same list as A',
    same(idsOf(sortTasks(merged)), idsOf(deviceAList)),
  )
  check(
    'and the drawn list is the one the drag asked for',
    same(idsOf(deviceAList), ['d', 'a', 'c', 'b']),
  )
}
