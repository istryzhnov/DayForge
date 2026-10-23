import { watch, type Ref } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { TaskTemplate } from '../../../entities/TaskEntity'
import { useSettings } from '../../../composables/useSettings'
import { useTimeEntries } from '../../../composables/useTimeEntries'
import { useUndoToast } from '../../../composables/useUndoToast'
import { buildRateLookup } from '../../../composables/timer/rates'
import {
  BUDGET_LEVEL,
  budgetStandingOf,
  isLevelUp,
  type BudgetLevel,
  type BudgetStanding,
} from './projectBudget'

function noticeFor(title: string, standing: BudgetStanding): string {
  const percent = Math.round(standing.fraction * 100)
  if (standing.level === BUDGET_LEVEL.OVER) {
    return `${title} is over its budget (${percent}%).`
  }
  return `${title} has used ${percent}% of its budget.`
}

/**
 * Posts one notice when a project's budget moves up to 80% or to 100% after a
 * session is recorded. Levels are remembered per project, and they are
 * re-read silently whenever a budget is set or changed, so a notice only ever
 * reports a real move. Opening the app or editing a limit never posts one.
 */
export function useBudgetAlerts(
  goals: Ref<Goal[]>,
  templates: Ref<TaskTemplate[]>,
) {
  const { entries } = useTimeEntries()
  const { settings } = useSettings()
  const { offerNotice } = useUndoToast()

  const levels = new Map<string, BudgetLevel>()

  function read(notify: boolean) {
    const now = new Date()
    const lookup = buildRateLookup(
      templates.value,
      goals.value,
      settings.timer.hourlyRate,
    )

    goals.value.forEach((goal) => {
      const standing = budgetStandingOf(goal, {
        allEntries: entries.value,
        goals: goals.value,
        lookup,
        now,
      })

      if (!standing) {
        levels.delete(goal.id)
        return
      }

      const previous = levels.get(goal.id)
      levels.set(goal.id, standing.level)

      if (!notify || standing.level === BUDGET_LEVEL.OK) return
      if (!isLevelUp(previous, standing.level)) return

      offerNotice(noticeFor(goal.title, standing), 'Got it', () => {})
    })
  }

  // Budget edits only re-baseline; the next recorded session is what can notify.
  const budgetKey = () =>
    goals.value
      .map((goal) => `${goal.id}:${JSON.stringify(goal.budget ?? null)}`)
      .join('|')
  watch(budgetKey, () => read(false))

  watch(entries, () => read(true))

  read(false)
}
