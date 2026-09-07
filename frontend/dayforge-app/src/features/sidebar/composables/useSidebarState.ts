import { computed, ref } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { ID } from '../../../entities/types'
import { GOAL_STATUS } from '../../../entities/constants'

type SidebarProps = {
  goals: Goal[]
  activeGoalId: ID | null
}

type SidebarActions = {
  onSelectGoal: (goalId: ID | null) => void
  onCreateGoal: (title: string, description: string) => void
  onDeleteGoal: (goalId: ID) => void
}

export function useSidebarState(props: SidebarProps, actions: SidebarActions) {
  const showNewGoalForm = ref(false)
  const showArchived = ref(false)

  /** An archived project leaves the list, but never while it is the open one. */
  const listedGoals = computed(() =>
    props.goals.filter(
      (goal) =>
        goal.status !== GOAL_STATUS.ARCHIVED || goal.id === props.activeGoalId,
    ),
  )

  const archivedGoals = computed(() =>
    props.goals.filter(
      (goal) =>
        goal.status === GOAL_STATUS.ARCHIVED && goal.id !== props.activeGoalId,
    ),
  )

  function toggleArchived() {
    showArchived.value = !showArchived.value
  }

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
    listedGoals,
    archivedGoals,
    showArchived,
    toggleArchived,
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
