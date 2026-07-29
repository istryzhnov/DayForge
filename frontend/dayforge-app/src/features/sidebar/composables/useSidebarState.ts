import { ref } from 'vue'
import type { ID } from '../../../entities/types'

type SidebarActions = {
  onSelectGoal: (goalId: ID | null) => void
  onCreateGoal: (title: string, description: string) => void
}

export function useSidebarState(actions: SidebarActions) {
  const showNewGoalForm = ref(false)

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
  }
}
