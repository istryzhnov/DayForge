import { onUnmounted } from 'vue'
import type { useGoalSpace } from '../../../composables/useGoalSpace'
import { useUndoToast } from '../../../composables/useUndoToast'
import { useMobileNav } from '../../sidebar/composables/useMobileNav'
import { onTaskDroppedOnGoal } from './taskDropTarget'

type GoalSpace = Pick<
  ReturnType<typeof useGoalSpace>,
  'goals' | 'taskTemplates' | 'assignTaskToGoal' | 'attachTaskToProject'
>

/**
 * Handles a task dropped on a sidebar project. It goes through the same
 * `assignTaskToGoal` path as "Move to…", which carries subtasks along and
 * detaches the task from a project it no longer belongs to.
 */
export function useTaskGoalDrop(goalSpace: GoalSpace) {
  const { offerUndo } = useUndoToast()
  const { close: closeMobileNav } = useMobileNav()

  const unsubscribe = onTaskDroppedOnGoal((templateId, goalId) => {
    const template = goalSpace.taskTemplates.value.find(
      (item) => item.id === templateId,
    )
    if (!template || template.goalId === goalId) return

    const title = template.title
    const previousGoalId = template.goalId
    const previousParentId = template.parentTemplateId

    goalSpace.assignTaskToGoal(templateId, goalId)

    const goalTitle =
      goalSpace.goals.value.find((goal) => goal.id === goalId)?.title ??
      'project'

    offerUndo(`Moved "${title}" to ${goalTitle}`, () => {
      goalSpace.assignTaskToGoal(templateId, previousGoalId)
      if (previousParentId) {
        goalSpace.attachTaskToProject(templateId, previousParentId)
      }
    })

    closeMobileNav()
  })

  onUnmounted(unsubscribe)
}
