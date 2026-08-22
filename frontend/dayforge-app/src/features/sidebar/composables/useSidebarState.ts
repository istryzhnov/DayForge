import { ref } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { ID } from '../../../entities/types'

type SidebarActions = {
  onSelectGoal: (goalId: ID | null) => void
  onCreateGoal: (title: string, description: string) => void
  onDeleteGoal: (goalId: ID) => void
}

export function useSidebarState(actions: SidebarActions) {
  const showNewGoalForm = ref(false)

  const contextMenuGoal = ref<Goal | null>(null)
  const contextMenuPos = ref<{ x: number; y: number } | null>(null)

  function openGoalContextMenu(payload: { goal: Goal; x: number; y: number }) {
    contextMenuGoal.value = payload.goal
    contextMenuPos.value = { x: payload.x, y: payload.y }
  }

  function closeGoalContextMenu() {
    contextMenuGoal.value = null
    contextMenuPos.value = null
  }

  /**
   * Deleting a goal also drops its tasks — including past days the habit
   * calendar counted — so it asks first, matching the goal settings menu.
   */
  function deleteGoalFromMenu() {
    const goal = contextMenuGoal.value
    closeGoalContextMenu()
    if (!goal) return

    const confirmed = window.confirm(
      `Delete goal "${goal.title}"? This cannot be undone.`,
    )
    if (confirmed) actions.onDeleteGoal(goal.id)
  }

  function openNewGoalForm() {
    showNewGoalForm.value = true
  }

  function closeNewGoalForm() {
    showNewGoalForm.value = false
  }

  function selectGoal(goalId: ID | null) {
    actions.onSelectGoal(goalId)
  }

  function createGoal(title: string, description: string) {
    actions.onCreateGoal(title, description)
    closeNewGoalForm()
  }

  return {
    showNewGoalForm,
    openNewGoalForm,
    closeNewGoalForm,
    selectGoal,
    createGoal,
    contextMenuGoal,
    contextMenuPos,
    openGoalContextMenu,
    closeGoalContextMenu,
    deleteGoalFromMenu,
  }
}
