import { computed, ref } from 'vue'
import type { TaskSchedule } from '../../../entities/TaskEntity'
import type { TaskNode } from '../../../shared/composables/useTaskTree'
import { PRIORITY, TASK_STATUS } from '../../../entities/constants'
import type { TaskActions } from './useTaskActions'
import { useIsCoarsePointer } from '../../../shared/composables/useMediaQuery'
import {
  usePressGesture,
  type GesturePoint,
} from '../../../shared/composables/usePressGesture'

type TaskRowProps = {
  node: TaskNode
  isNested?: boolean
  /** Drawn as the header of a block of children, so the row has children. */
  isProjectHeader?: boolean
}

/** Touch drag hooks; absent for rows that cannot be moved. */
type TaskRowTouchDrag = {
  begin: (point: GesturePoint) => void
  move: (point: GesturePoint) => void
  drop: () => void
  cancel: () => void
}

export function useTaskRow(
  props: TaskRowProps,
  actions: TaskActions,
  drag?: TaskRowTouchDrag,
) {
  const contextMenuPos = ref<{ x: number; y: number } | null>(null)
  const isEditing = ref(false)
  /** The panel opens with the calendar fields already on. */
  const editorStartsScheduled = ref(false)
  const isRateEditing = ref(false)

  /** "Important": a tag and a colour. Says nothing about nesting. */
  const isImportant = computed(
    () => props.node.task.priority === PRIORITY.MAJOR,
  )
  /** Structure: other rows are filed under this one. */
  const hasChildren = computed(() => !!props.isProjectHeader)
  const hasOwnRate = computed(() => (props.node.template?.hourlyRate ?? 0) > 0)
  const isDone = computed(() => props.node.task.status === TASK_STATUS.DONE)

  const isCoarsePointer = useIsCoarsePointer()

  // On touch a held row is picked up: move it to drag, release it in place to
  // get the menu. Without a drag target the hold goes straight to the menu.
  const { isLifted, onPointerDown } = usePressGesture({
    isEnabled: () => isCoarsePointer.value,
    onLift: (point) => {
      if (!drag) {
        contextMenuPos.value = { x: point.x, y: point.y }
        return
      }
      drag.begin(point)
    },
    onDragMove: (point) => drag?.move(point),
    onDrop: () => drag?.drop(),
    onLongPress: (point) => {
      drag?.cancel()
      contextMenuPos.value = { x: point.x, y: point.y }
    },
    onCancel: () => drag?.cancel(),
  })

  function openContextMenu(event: MouseEvent) {
    if (isCoarsePointer.value) return
    contextMenuPos.value = { x: event.clientX, y: event.clientY }
  }

  function closeContextMenu() {
    contextMenuPos.value = null
  }

  function openEditor(startScheduled = false) {
    editorStartsScheduled.value = startScheduled
    isEditing.value = true
  }

  function closeEditor() {
    isEditing.value = false
    editorStartsScheduled.value = false
  }

  function openRateEditor() {
    isRateEditing.value = true
  }

  function closeRateEditor() {
    isRateEditing.value = false
  }

  function saveNotes(notes: string) {
    actions.editNotes(props.node.task.templateId, notes)
  }

  function saveRate(hourlyRate: number | undefined) {
    actions.setRate(props.node.task.templateId, hourlyRate)
  }

  /** A title that didn't actually change isn't worth an update. */
  function saveEdits(title: string, schedule: TaskSchedule | null) {
    if (title !== props.node.task.title) {
      actions.editTitle(props.node.task.templateId, title)
    }
    actions.schedule(props.node.task.templateId, schedule)
  }

  return {
    contextMenuPos,
    isEditing,
    editorStartsScheduled,
    isRateEditing,
    isImportant,
    hasChildren,
    isDone,
    hasOwnRate,
    isLifted,
    onPointerDown,
    openContextMenu,
    closeContextMenu,
    openEditor,
    closeEditor,
    openRateEditor,
    closeRateEditor,
    saveRate,
    saveEdits,
    saveNotes,
  }
}
