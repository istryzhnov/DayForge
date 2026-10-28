import { computed, ref, useTemplateRef } from 'vue'
import type { DailyTask } from '../../../entities/TaskEntity'
import type { ID } from '../../../entities/types'
import { TASK_STATUS } from '../../../entities/constants'
import { useIsCoarsePointer } from '../../../composables/useMediaQuery'
import { useFormat } from '../../../composables/useFormat'
import {
  usePressGesture,
  type GesturePoint,
} from '../../../composables/usePressGesture'
import {
  clampMinutes,
  minutesFromDayStart,
  pxPerMinute,
  snapMinutes,
  snapStepMinutes,
  timeFromMinutes,
} from './useCalendarGrid'

type BlockProps = {
  task: DailyTask
  themeVars?: Record<string, string>
  /** Left/width once overlapping blocks have been split into columns. */
  columnStyle?: Record<string, string>
}

type BlockActions = {
  onDragStart: (payload: { taskId: ID; grabOffsetMinutes: number }) => void
  onResize: (payload: { taskId: ID; endTime: string }) => void
  onContextMenu: (payload: { taskId: ID; x: number; y: number }) => void
  onTouchLift: (payload: { taskId: ID; grabOffsetMinutes: number }) => void
  onTouchMove: (point: GesturePoint) => void
  onTouchDrop: (point: GesturePoint) => void
  onTouchCancel: () => void
}

export function useCalendarEventBlock(
  props: BlockProps,
  actions: BlockActions,
) {
  // Bound by name to `ref="blockRef"` in the template.
  const blockRef = useTemplateRef<HTMLElement>('blockRef')
  const isResizing = ref(false)
  const blockNativeDrag = ref(false)

  const isCoarsePointer = useIsCoarsePointer()
  const { formatTime } = useFormat()

  const isDone = computed(() => props.task.status === TASK_STATUS.DONE)
  const isDraggable = computed(
    () => !isCoarsePointer.value && !isResizing.value,
  )

  function blockStyle(top: number, height: number) {
    return {
      ...(props.themeVars ?? {}),
      ...(props.columnStyle ?? {}),
      top: `${top}px`,
      height: `${Math.max(height, 20)}px`,
    }
  }

  /** Where inside the block the pointer grabbed it, so drops feel anchored. */
  function grabOffsetFrom(clientY: number): number {
    const rect = blockRef.value?.getBoundingClientRect()
    if (!rect) return 0
    return Math.round((clientY - rect.top) / pxPerMinute())
  }

  // --- touch: long-press to lift, then drag or open the context menu ------

  const { isLifted, onPointerDown } = usePressGesture({
    isEnabled: () => isCoarsePointer.value && !isResizing.value,
    onLift: (point) =>
      actions.onTouchLift({
        taskId: props.task.id,
        grabOffsetMinutes: grabOffsetFrom(point.y),
      }),
    onDragMove: actions.onTouchMove,
    onDrop: actions.onTouchDrop,
    onLongPress: (point) =>
      actions.onContextMenu({ taskId: props.task.id, x: point.x, y: point.y }),
    onCancel: actions.onTouchCancel,
  })

  // --- desktop: native drag and right-click -------------------------------

  function onDragStart(event: DragEvent) {
    if (isResizing.value || blockNativeDrag.value) {
      event.preventDefault()
      return
    }

    event.dataTransfer?.setData('text/plain', props.task.id)
    actions.onDragStart({
      taskId: props.task.id,
      grabOffsetMinutes: grabOffsetFrom(event.clientY),
    })
  }

  function onContextMenu(event: MouseEvent) {
    actions.onContextMenu({
      taskId: props.task.id,
      x: event.clientX,
      y: event.clientY,
    })
  }

  // --- the resize handle ---------------------------------------------------

  function onResizeHandleDown(event: PointerEvent) {
    event.preventDefault()
    event.stopPropagation()
    isResizing.value = true
    blockNativeDrag.value = true

    const startClientY = event.clientY
    const startMin = minutesFromDayStart(props.task.startTime!)
    const initialDurationMin =
      minutesFromDayStart(props.task.endTime!) - startMin

    function onMove(moveEvent: PointerEvent) {
      if (!isResizing.value) return
      const deltaMin = Math.round(
        (moveEvent.clientY - startClientY) / pxPerMinute(),
      )
      const newEndMin = clampMinutes(
        startMin +
          Math.max(
            snapStepMinutes(),
            snapMinutes(initialDurationMin + deltaMin),
          ),
      )
      actions.onResize({
        taskId: props.task.id,
        endTime: timeFromMinutes(newEndMin),
      })
    }

    function onUp() {
      isResizing.value = false
      setTimeout(() => {
        blockNativeDrag.value = false
      }, 0)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return {
    isDone,
    isResizing,
    isLifted,
    isDraggable,
    formatTime,
    blockStyle,
    onPointerDown,
    onDragStart,
    onContextMenu,
    onResizeHandleDown,
  }
}
