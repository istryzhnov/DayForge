import { computed, ref } from 'vue'
import type { DailyTask } from '../../../entities/TaskEntity'
import type { ID } from '../../../entities/types'
import { PRIORITY } from '../../../entities/constants'

type SelectionOptions = {
  getTasks: () => DailyTask[]
}

export function useCalendarSelection(options: SelectionOptions) {
  const selectedTaskId = ref<ID | null>(null)
  const contextMenuTaskId = ref<ID | null>(null)
  const contextMenuPos = ref<{ x: number; y: number } | null>(null)

  function findTask(taskId: ID | null) {
    if (!taskId) return null
    return options.getTasks().find((task) => task.id === taskId) ?? null
  }

  const selectedTask = computed(() => findTask(selectedTaskId.value))
  const contextMenuTask = computed(() => findTask(contextMenuTaskId.value))
  const isContextMenuOpen = computed(
    () => contextMenuTask.value !== null && contextMenuPos.value !== null,
  )

  function closeContextMenu() {
    contextMenuTaskId.value = null
    contextMenuPos.value = null
  }

  function closeDetails() {
    selectedTaskId.value = null
  }

  function openDetails(taskId: ID) {
    closeContextMenu()
    selectedTaskId.value = taskId
  }

  function openContextMenu(payload: { taskId: ID; x: number; y: number }) {
    const task = options.getTasks().find((item) => item.id === payload.taskId)

    if (!task || task.priority !== PRIORITY.MINOR) {
      closeContextMenu()
      return
    }

    selectedTaskId.value = null
    contextMenuTaskId.value = payload.taskId
    contextMenuPos.value = { x: payload.x, y: payload.y }
  }

  return {
    selectedTaskId,
    selectedTask,
    contextMenuTask,
    contextMenuPos,
    isContextMenuOpen,
    openDetails,
    closeDetails,
    openContextMenu,
    closeContextMenu,
  }
}
