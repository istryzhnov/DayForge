import { computed, ref } from 'vue'
import type { ID } from '../../../entities/types'
import type { TaskSchedule } from '../../../entities/TaskEntity'
import type { TaskNode } from '../../../composables/useTaskTree'
import { PRIORITY, TASK_STATUS } from '../../../entities/constants'
import { useIsCoarsePointer } from '../../../composables/useMediaQuery'
import {
  usePressGesture,
  type GesturePoint,
} from '../../../composables/usePressGesture'

type TaskRowProps = {
  node: TaskNode
  isNested?: boolean
}

type TaskRowActions = {
  onEditTask: (templateId: ID, title: string) => void
  onEditNotes: (templateId: ID, notes: string) => void
  onScheduleTask: (templateId: ID, schedule: TaskSchedule | null) => void
  onSetTaskRate: (templateId: ID, hourlyRate: number | undefined) => void
  /** Touch drag hooks; absent for rows that cannot be moved. */
  drag?: {
    begin: (point: GesturePoint) => void
    move: (point: GesturePoint) => void
    drop: () => void
    cancel: () => void
  }
}

export function useTaskRow(props: TaskRowProps, actions: TaskRowActions) {
  const contextMenuPos = ref<{ x: number; y: number } | null>(null)
  const isEditing = ref(false)
  /** The panel opens with the calendar fields already on. */
  const editorStartsScheduled = ref(false)
  const isRateEditing = ref(false)

  const isProject = computed(() => props.node.task.priority === PRIORITY.MAJOR)
  const hasOwnRate = computed(
    () => (props.node.template?.hourlyRate ?? 0) > 0,
  )
  const isDone = computed(() => props.node.task.status === TASK_STATUS.DONE)
  const canSetAsProject = computed(() => !isProject.value && !props.isNested)

  const isCoarsePointer = useIsCoarsePointer()

  // On touch a held row is picked up: move it to drag, release it in place to
  // get the menu. Without a drag target the hold goes straight to the menu.
  const { isLifted, onPointerDown } = usePressGesture({
    isEnabled: () => isCoarsePointer.value,
    onLift: (point) => {
      if (!actions.drag) {
        contextMenuPos.value = { x: point.x, y: point.y }
        return
      }
      actions.drag.begin(point)
    },
    onDragMove: (point) => actions.drag?.move(point),
    onDrop: () => actions.drag?.drop(),
    onLongPress: (point) => {
      actions.drag?.cancel()
      contextMenuPos.value = { x: point.x, y: point.y }
    },
    onCancel: () => actions.drag?.cancel(),
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
    actions.onEditNotes(props.node.task.templateId, notes)
  }

  function saveRate(hourlyRate: number | undefined) {
    actions.onSetTaskRate(props.node.task.templateId, hourlyRate)
  }

  /** A title that didn't actually change isn't worth an update. */
  function saveEdits(title: string, schedule: TaskSchedule | null) {
    if (title !== props.node.task.title) {
      actions.onEditTask(props.node.task.templateId, title)
    }
    actions.onScheduleTask(props.node.task.templateId, schedule)
  }

  return {
    contextMenuPos,
    isEditing,
    editorStartsScheduled,
    isRateEditing,
    isProject,
    isDone,
    canSetAsProject,
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
