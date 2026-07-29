import { ref } from 'vue'
import type { ID, Priority } from '../../../entities/types'
import type { MajorDecision } from '../../../entities/TaskEntity'

type TaskListActions = {
  onAddSubtask: (
    parentTemplateId: ID,
    title: string,
    priority: Priority,
  ) => void
  onToggleMinor: (taskId: ID) => void
  onResolveMajor: (taskId: ID, decision: MajorDecision) => void
}

export function useTaskListState(actions: TaskListActions) {
  const activeParentId = ref<ID | null>(null)

  function toggleParent(nodeId: ID) {
    activeParentId.value = activeParentId.value === nodeId ? null : nodeId
  }

  function handleSubtaskSubmit(
    parentTemplateId: ID,
    title: string,
    priority: Priority,
  ) {
    actions.onAddSubtask(parentTemplateId, title, priority)
    activeParentId.value = null
  }

  function toggleMinor(taskId: ID) {
    actions.onToggleMinor(taskId)
  }

  function resolveMajor(taskId: ID, decision: MajorDecision) {
    actions.onResolveMajor(taskId, decision)
  }

  return {
    activeParentId,
    toggleParent,
    handleSubtaskSubmit,
    toggleMinor,
    resolveMajor,
  }
}
