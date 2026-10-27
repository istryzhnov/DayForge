import { computed, ref } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { ID } from '../../../entities/types'
import { GOAL_STATUS } from '../../../entities/constants'
import { sortGoals } from '../../../composables/goalSpace/goalOrder'

type SidebarProps = {
  goals: Goal[]
  activeGoalId: ID | null
}

type SidebarActions = {
  onSelectGoal: (goalId: ID | null) => void
  onCreateGoal: (title: string, description: string, color: string) => void
  onDeleteGoal: (goalId: ID) => void
  onReorderGoals: (orderedIds: ID[]) => void
}

export function useSidebarState(props: SidebarProps, actions: SidebarActions) {
  const showNewGoalForm = ref(false)
  const showArchived = ref(false)

  /** An archived project leaves the list, but never while it is the open one. */
  const listedGoals = computed(() =>
    sortGoals(
      props.goals.filter(
        (goal) =>
          goal.status !== GOAL_STATUS.ARCHIVED ||
          goal.id === props.activeGoalId,
      ),
    ),
  )

  const archivedGoals = computed(() =>
    sortGoals(
      props.goals.filter(
        (goal) =>
          goal.status === GOAL_STATUS.ARCHIVED &&
          goal.id !== props.activeGoalId,
      ),
    ),
  )

  function reorderGoals(orderedIds: ID[]) {
    actions.onReorderGoals(orderedIds)
  }

  /** Touch has no drag for projects, so the menu moves one a step instead. */
  function moveGoalFromMenu(step: -1 | 1) {
    const goal = contextMenuGoal.value
    closeGoalContextMenu()
    if (!goal) return

    const ids = listedGoals.value.map((item) => item.id)
    const index = ids.indexOf(goal.id)
    const target = index + step
    if (index === -1 || target < 0 || target >= ids.length) return

    ids.splice(index, 1)
    ids.splice(target, 0, goal.id)
    reorderGoals(ids)
  }

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

  function createGoal(title: string, description: string, color: string) {
    actions.onCreateGoal(title, description, color)
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
    reorderGoals,
    moveGoalFromMenu,
  }
}
