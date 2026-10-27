import { computed, type ComputedRef } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { TaskTemplate } from '../../../entities/TaskEntity'
import { useSettings } from '../../../composables/useSettings'
import { useTimeEntries } from '../../../composables/useTimeEntries'
import { buildRateLookup } from '../../../composables/timer/rates'
import { budgetStandingOf, type BudgetStanding } from './projectBudget'

/** Live budget standing of one project, or null when it has no budget. */
export function useProjectBudgetStatus(
  getGoal: () => Goal | null,
  getGoals: () => Goal[],
  getTemplates: () => TaskTemplate[],
): ComputedRef<BudgetStanding | null> {
  const { entries } = useTimeEntries()
  const { settings } = useSettings()

  return computed(() => {
    const goal = getGoal()
    if (!goal) return null

    const goals = getGoals()
    return budgetStandingOf(goal, {
      allEntries: entries.value,
      goals,
      lookup: buildRateLookup(getTemplates(), goals, settings.timer.hourlyRate),
      now: new Date(),
    })
  })
}
