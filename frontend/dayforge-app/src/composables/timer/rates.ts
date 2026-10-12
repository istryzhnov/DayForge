import type { Goal } from '../../entities/GoalEntity'
import type { TaskTemplate } from '../../entities/TaskEntity'
import type { TimeEntry } from '../../entities/TimerEntity'
import type { ID } from '../../entities/types'
import { earningsFor, projectTotalKey } from './analytics'
import { entryDurationMs, taskTotalKey } from './entries'

/** Every rate in play, so a row can be priced without touching Vue state. */
export interface RateLookup {
  byTask: Map<ID, number>
  byGoal: Map<ID, number>
  defaultRate: number
}

/** Task beats project beats the global default; a zero rate is "unset". */
export function rateFromChain(
  taskRate: number | undefined,
  goalRate: number | undefined,
  defaultRate: number,
): number {
  if (taskRate !== undefined && taskRate > 0) return taskRate
  if (goalRate !== undefined && goalRate > 0) return goalRate
  return defaultRate
}

export function buildRateLookup(
  templates: TaskTemplate[],
  goals: Goal[],
  defaultRate: number,
): RateLookup {
  const byTask = new Map<ID, number>()
  templates.forEach((template) => {
    if ((template.hourlyRate ?? 0) > 0) {
      byTask.set(template.id, template.hourlyRate as number)
    }
  })

  const byGoal = new Map<ID, number>()
  goals.forEach((goal) => {
    if ((goal.hourlyRate ?? 0) > 0) {
      byGoal.set(goal.id, goal.hourlyRate as number)
    }
  })

  return { byTask, byGoal, defaultRate }
}

export function rateForTask(
  lookup: RateLookup,
  taskId?: ID,
  goalId?: ID,
): number {
  return rateFromChain(
    taskId ? lookup.byTask.get(taskId) : undefined,
    goalId ? lookup.byGoal.get(goalId) : undefined,
    lookup.defaultRate,
  )
}

/** Whether money is worth showing at all. */
export function hasAnyRate(lookup: RateLookup): boolean {
  return (
    lookup.defaultRate > 0 || lookup.byGoal.size > 0 || lookup.byTask.size > 0
  )
}

export interface EarningsBreakdown {
  total: number
  /** Keyed like `TaskTotal.key`. */
  byTask: Map<string, number>
  /** Keyed like `ProjectTotal`, so a missing project has its own bucket. */
  byProject: Map<string, number>
  /** Projects whose tasks are billed at more than one rate. */
  mixedProjects: Set<string>
}

/**
 * Earnings summed one entry at a time. Rates differ per task, so a total can
 * never be time × a single rate.
 */
export function breakdownEarnings(
  entries: TimeEntry[],
  lookup: RateLookup,
): EarningsBreakdown {
  const byTask = new Map<string, number>()
  const byProject = new Map<string, number>()
  const ratesSeen = new Map<string, Set<number>>()
  let total = 0

  entries.forEach((entry) => {
    const rate = rateForTask(lookup, entry.taskId, entry.goalId)
    const earned = earningsFor(entryDurationMs(entry), rate)
    total += earned

    const taskKey = taskTotalKey(entry)
    byTask.set(taskKey, (byTask.get(taskKey) ?? 0) + earned)

    const projectKey = projectTotalKey(entry)
    byProject.set(projectKey, (byProject.get(projectKey) ?? 0) + earned)

    const rates = ratesSeen.get(projectKey) ?? new Set<number>()
    rates.add(rate)
    ratesSeen.set(projectKey, rates)
  })

  const mixedProjects = new Set(
    [...ratesSeen]
      .filter(([, rates]) => rates.size > 1)
      .map(([projectKey]) => projectKey),
  )

  return { total, byTask, byProject, mixedProjects }
}
