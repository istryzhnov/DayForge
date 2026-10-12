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
  onScheduleTask: (templateId: ID, schedule: TaskSchedule | null) => void
  onSetTaskRate: (templateId: ID, hourlyRate: number | undefined) => void
  onDeleteTask: (templateId: ID) => void
  onSetAsProject: (templateId: ID) => void
  onMoveTask: (templateId: ID) => void
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

  function scheduleTask(templateId: ID, schedule: TaskSchedule | null) {
    actions.onScheduleTask(templateId, schedule)
  }

  function setTaskRate(templateId: ID, hourlyRate: number | undefined) {
    actions.onSetTaskRate(templateId, hourlyRate)
  }

  function deleteTask(templateId: ID) {
    actions.onDeleteTask(templateId)
  }

  function setAsProject(templateId: ID) {
    actions.onSetAsProject(templateId)
  }

  function moveTask(templateId: ID) {
    actions.onMoveTask(templateId)
  }

  return {
    activeParentId,
    toggleParent,
    handleSubtaskSubmit,
    toggleDone,
    editTask,
    scheduleTask,
    setTaskRate,
    deleteTask,
    setAsProject,
    moveTask,
  }
}
