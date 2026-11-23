import { describe, expect, it } from 'vitest'
import type {
  TaskGroup,
  TaskNode,
} from '../../src/shared/composables/useTaskTree'
import type { DailyTask } from '../../src/entities/TaskEntity'
import type { TimeEntry } from '../../src/entities/TimerEntity'
import {
  filterGroupsByProject,
  flattenNodes,
  todayTrackedMs,
} from '../../src/features/goals/composables/todayView'

const TODAY = '2026-09-02'

function node(id: string, goalId?: string): TaskNode {
  return { task: { id, title: id, goalId } as unknown as DailyTask }
}

const groups: TaskGroup[] = [
  { kind: 'task', node: node('solo-a', 'a') },
  { kind: 'task', node: node('solo-b', 'b') },
  {
    kind: 'project',
    project: node('proj-a', 'a'),
    children: [node('child-a', 'a'), node('child-b', 'b')],
    doneCount: 0,
    totalCount: 2,
  },
]

describe('filterGroupsByProject', () => {
  it('keeps standalone rows and whole blocks of the chosen project', () => {
    const kept = filterGroupsByProject(groups, 'a')
    expect(
      kept.map((g) => (g.kind === 'task' ? g.node.task.id : g.project.task.id)),
    ).toEqual(['solo-a', 'proj-a'])
    expect(kept[1]).toBe(groups[2])
  })

  it('lifts a foreign subtask out of another project block', () => {
    const kept = filterGroupsByProject(groups, 'b')
    expect(kept).toHaveLength(2)
    expect(kept[0]).toEqual({ kind: 'task', node: node('solo-b', 'b') })
    expect(kept[1]).toEqual({ kind: 'task', node: node('child-b', 'b') })
  })

  it('returns nothing for a project with no rows', () => {
    expect(filterGroupsByProject(groups, 'c')).toEqual([])
  })
})

describe('flattenNodes and projectsWithRows', () => {
  it('counts a project header plus its children', () => {
    expect(flattenNodes(groups)).toHaveLength(5)
  })
})

describe('todayTrackedMs', () => {
  const entry = (goalId: string, start: string, ms: number) =>
    ({
      id: `${goalId}-${start}`,
      goalId,
      startedAt: start,
      endedAt: new Date(Date.parse(start) + ms).toISOString(),
    }) as unknown as TimeEntry

  it('sums only today, optionally for one project', () => {
    const local = new Date(2026, 8, 2, 10).toISOString()
    const yesterday = new Date(2026, 8, 1, 10).toISOString()
    const entries = [
      entry('a', local, 60_000),
      entry('b', local, 120_000),
      entry('a', yesterday, 999_000),
    ]
    expect(todayTrackedMs(entries, null, TODAY)).toBe(180_000)
    expect(todayTrackedMs(entries, 'a', TODAY)).toBe(60_000)
  })
})
