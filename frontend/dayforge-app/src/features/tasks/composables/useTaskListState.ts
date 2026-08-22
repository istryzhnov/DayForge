import { ref } from 'vue'
import type { ID, Priority } from '../../../entities/types'
import type { TaskSchedule } from '../../../entities/TaskEntity'

type TaskListActions = {
  onAddSubtask: (
    parentTemplateId: ID,
    title: string,
    priority: Priority,
    schedule?: TaskSchedule,
  ) => void
  onToggleDone: (taskId: ID) => void
  onEditTask: (templateId: ID, title: string) => void
  onDeleteTask: (templateId: ID) => void
  onSetAsProject: (templateId: ID) => void
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

  function toggleDone(taskId: ID) {
    actions.onToggleDone(taskId)
  }

  function editTask(templateId: ID, title: string) {
    actions.onEditTask(templateId, title)
  }

  function deleteTask(templateId: ID) {
    actions.onDeleteTask(templateId)
  }

  function setAsProject(templateId: ID) {
    actions.onSetAsProject(templateId)
  }

  return {
    activeParentId,
    toggleParent,
    handleSubtaskSubmit,
    toggleDone,
    editTask,
    deleteTask,
    setAsProject,
  }
}
