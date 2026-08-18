import { ref } from 'vue'
import type { ID, Priority } from '../../../entities/types'
import type { MajorDecision, TaskSchedule } from '../../../entities/TaskEntity'

type TaskListActions = {
  onAddSubtask: (
    parentTemplateId: ID,
    title: string,
    priority: Priority,
    schedule?: TaskSchedule,
  ) => void
  onToggleMinor: (taskId: ID) => void
  onResolveMajor: (taskId: ID, decision: MajorDecision) => void
  onEditTask: (templateId: ID, title: string) => void
  onDeleteTask: (templateId: ID) => void
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
    schedule?: TaskSchedule,
  ) {
    actions.onAddSubtask(parentTemplateId, title, priority, schedule)
    activeParentId.value = null
  }

  function toggleMinor(taskId: ID) {
    actions.onToggleMinor(taskId)
  }

  function resolveMajor(taskId: ID, decision: MajorDecision) {
    actions.onResolveMajor(taskId, decision)
  }

  function editTask(templateId: ID, title: string) {
    actions.onEditTask(templateId, title)
  }

  function deleteTask(templateId: ID) {
    actions.onDeleteTask(templateId)
  }

  return {
    activeParentId,
    toggleParent,
    handleSubtaskSubmit,
    toggleMinor,
    resolveMajor,
    editTask,
    deleteTask,
  }
}
