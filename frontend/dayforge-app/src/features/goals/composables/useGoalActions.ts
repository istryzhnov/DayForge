import { inject, provide, type InjectionKey } from 'vue'
import type { GoalTheme } from '../../../entities/GoalEntity'
import type { GoalStatus, ID } from '../../../entities/types'
import type { ProjectBudget } from '../../analytics/composables/projectBudget'

/**
 * Everything the project settings can change about a project. Provided once by
 * the page, like the task actions, so the settings column does not have to
 * relay each change as an event of its own.
 */
export interface GoalActions {
  updateDetails(goalId: ID, title: string, description: string): void
  updateStatus(goalId: ID, status: GoalStatus): void
  updateTheme(goalId: ID, theme: GoalTheme | undefined): void
  updateIcon(goalId: ID, icon: string | undefined): void
  updateRate(goalId: ID, hourlyRate: number | undefined): void
  updateBudget(goalId: ID, budget: ProjectBudget | undefined): void
  updateClient(goalId: ID, clientId: ID | undefined): void
  setBoard(goalId: ID, enabled: boolean): void
  remove(goalId: ID): void
}

const GOAL_ACTIONS_KEY: InjectionKey<GoalActions> = Symbol('goal-actions')

export function provideGoalActions(actions: GoalActions) {
  provide(GOAL_ACTIONS_KEY, actions)
}

export function useGoalActions(): GoalActions {
  const actions = inject(GOAL_ACTIONS_KEY)
  if (!actions) {
    throw new Error(
      'useGoalActions() needs provideGoalActions() in a parent component',
    )
  }
  return actions
}
