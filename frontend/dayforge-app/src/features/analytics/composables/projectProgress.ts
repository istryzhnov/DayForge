import type { PlanVsActualRow } from './planVsActual'

/** A project as the Time list shows it: tracked time, adjusted for manual hours. */
export interface ProgressSource {
  key: string
  goalId?: string
  title: string
  color?: string
  taskCount: number
  trackedMs: number
}

export interface ProjectProgress {
  key: string
  goalId?: string
  title: string
  color?: string
  taskCount: number
  trackedMs: number
  plannedMs: number
  /** False when nothing is planned for the project; its bar is neutral, never red. */
  planned: boolean
  /** Tracked minus planned; null when nothing is planned. */
  diffMs: number | null
  /** Bar fill as a share of the track, capped at full. Unplanned bars are full. */
  fill: number
}

/**
 * One row per project: every project listed above, plus any planned project
 * with no time yet, so a plan with nothing tracked still shows. Plan rows are
 * matched by key, the same key the project list uses. A planned-only row takes
 * its project's colour from `colorByGoal`, as the listed rows already have it.
 */
export function mergeProjectProgress(
  sources: ProgressSource[],
  plans: PlanVsActualRow[],
  colorByGoal: Map<string, string> = new Map(),
): ProjectProgress[] {
  const planByKey = new Map(plans.map((plan) => [plan.key, plan]))
  const listedKeys = new Set(sources.map((source) => source.key))

  const listed = sources.map((source): ProjectProgress => {
    const plannedMs = planByKey.get(source.key)?.plannedMs ?? 0
    return progressRow(source, plannedMs)
  })

  const plannedOnly = plans
    .filter((plan) => !listedKeys.has(plan.key))
    .map((plan): ProjectProgress =>
      progressRow(
        {
          key: plan.key,
          goalId: plan.goalId,
          title: plan.title,
          color: plan.goalId ? colorByGoal.get(plan.goalId) : undefined,
          taskCount: 0,
          trackedMs: plan.actualMs,
        },
        plan.plannedMs,
      ),
    )

  return [...listed, ...plannedOnly].sort(
    (a, b) =>
      Math.max(b.trackedMs, b.plannedMs) - Math.max(a.trackedMs, a.plannedMs) ||
      a.title.localeCompare(b.title),
  )
}

function progressRow(
  source: ProgressSource,
  plannedMs: number,
): ProjectProgress {
  const planned = plannedMs > 0
  return {
    key: source.key,
    goalId: source.goalId,
    title: source.title,
    color: source.color,
    taskCount: source.taskCount,
    trackedMs: source.trackedMs,
    plannedMs,
    planned,
    diffMs: planned ? source.trackedMs - plannedMs : null,
    fill: planned ? Math.min(1, source.trackedMs / plannedMs) : 1,
  }
}
