import type { TimeEntry } from '../../../entities/TimerEntity'
import type { ID, ISODate } from '../../../entities/types'
import type {
  TaskGroup,
  TaskNode,
} from '../../../shared/composables/useTaskTree'
import {
  entriesOnDay,
  sumDurations,
} from '../../../shared/composables/timer/entries'

/** Time booked on `today`, to one project or to all of them when `goalId` is null. */
export function todayTrackedMs(
  entries: TimeEntry[],
  goalId: ID | null,
  today: ISODate,
): number {
  return sumDurations(
    entriesOnDay(entries, today).filter(
      (entry) => goalId === null || entry.goalId === goalId,
    ),
  )
}

/** Every row the list draws: a project header counts, and so does each child. */
export function flattenNodes(groups: TaskGroup[]): TaskNode[] {
  return groups.flatMap((group) =>
    group.kind === 'project'
      ? [group.project, ...group.children]
      : [group.node],
  )
}

/**
 * Keeps the rows of one project. A project whose header belongs to it keeps its
 * whole block; a subtask of it that sits under another project is lifted out
 * and shown on its own, so the filter never shows a foreign header.
 */
export function filterGroupsByProject(
  groups: TaskGroup[],
  goalId: ID,
): TaskGroup[] {
  const result: TaskGroup[] = []
  groups.forEach((group) => {
    if (group.kind === 'task') {
      if (group.node.task.goalId === goalId) result.push(group)
      return
    }
    if (group.project.task.goalId === goalId) {
      result.push(group)
      return
    }
    group.children
      .filter((child) => child.task.goalId === goalId)
      .forEach((child) => result.push({ kind: 'task', node: child }))
  })
  return result
}
