import { computed, nextTick, ref, useTemplateRef } from 'vue'
import type { ID } from '../../../entities/types'
import type { TaskNode } from '../../../composables/useTaskTree'
import { PRIORITY, TASK_STATUS } from '../../../entities/constants'
import { useIsCoarsePointer } from '../../../composables/useMediaQuery'
import { usePressGesture } from '../../../composables/usePressGesture'

/**
 * One task row: renaming in place, and the two ways its menu opens.
 *
 * Touch has no right-click, so a long press opens the same menu. The row isn't
 * draggable, so the menu opens as soon as the press registers rather than
 * waiting for the finger to lift.
 */

type TaskRowProps = {
  node: TaskNode
  isNested?: boolean
}

type TaskRowActions = {
  onEditTask: (templateId: ID, title: string) => void
}

export function useTaskRow(props: TaskRowProps, actions: TaskRowActions) {
  const contextMenuPos = ref<{ x: number; y: number } | null>(null)
  const isEditing = ref(false)
  const editValue = ref(props.node.task.title)
  // Bound by name to `ref="titleInputRef"` in the template.
  const titleInputRef = useTemplateRef<HTMLInputElement>('titleInputRef')

  const isProject = computed(() => props.node.task.priority === PRIORITY.MAJOR)
  const isDone = computed(() => props.node.task.status === TASK_STATUS.DONE)
  // Only a top-level plain task can become a project — nesting stops at two
  // levels.
  const canSetAsProject = computed(() => !isProject.value && !props.isNested)

  const isCoarsePointer = useIsCoarsePointer()

  const { isLifted, onPointerDown } = usePressGesture({
    isEnabled: () => isCoarsePointer.value,
    onLift: (point) => {
      contextMenuPos.value = { x: point.x, y: point.y }
    },
  })

  function openContextMenu(event: MouseEvent) {
    contextMenuPos.value = { x: event.clientX, y: event.clientY }
  }

  function closeContextMenu() {
    contextMenuPos.value = null
  }

  function startEditing() {
    editValue.value = props.node.task.title
    isEditing.value = true
    nextTick(() => titleInputRef.value?.focus())
  }

  /** A title that didn't actually change isn't worth an update. */
  function commitEditing() {
    isEditing.value = false
    if (editValue.value.trim() === props.node.task.title) return
    actions.onEditTask(props.node.task.templateId, editValue.value)
  }

  function cancelEditing() {
    isEditing.value = false
    editValue.value = props.node.task.title
  }

  return {
    contextMenuPos,
    isEditing,
    editValue,
    isProject,
    isDone,
    canSetAsProject,
    isLifted,
    onPointerDown,
    openContextMenu,
    closeContextMenu,
    startEditing,
    commitEditing,
    cancelEditing,
  }
}
