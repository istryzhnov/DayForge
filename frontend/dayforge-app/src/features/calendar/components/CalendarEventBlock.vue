<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DailyTask } from '../../../entities/TaskEntity'
import type { ID } from '../../../entities/types'
import { TASK_STATUS } from '../../../entities/constants'
import { useIsCoarsePointer } from '../../../composables/useMediaQuery'
import {
  usePressGesture,
  type GesturePoint,
} from '../../../composables/usePressGesture'
import {
  PX_PER_MINUTE,
  SNAP_MINUTES,
  clampMinutes,
  minutesFromDayStart,
  snapMinutes,
  timeFromMinutes,
} from '../composables/useCalendarGrid'

const props = defineProps<{
  task: DailyTask
  topPx: number
  heightPx: number
  isDragging?: boolean
  /** Its project's colours, when the project has its own. */
  themeVars?: Record<string, string>
}>()

const emit = defineEmits<{
  (e: 'select', taskId: ID): void
  (e: 'drag-start', payload: { taskId: ID; grabOffsetMinutes: number }): void
  (e: 'resize', payload: { taskId: ID; endTime: string }): void
  (e: 'context-menu', payload: { taskId: ID; x: number; y: number }): void
  (e: 'touch-lift', payload: { taskId: ID; grabOffsetMinutes: number }): void
  (e: 'touch-move', point: GesturePoint): void
  (e: 'touch-drop', point: GesturePoint): void
  (e: 'touch-cancel'): void
}>()

const isCoarsePointer = useIsCoarsePointer()
const isDone = computed(() => props.task.status === TASK_STATUS.DONE)
const isResizing = ref(false)
const blockNativeDrag = ref(false)
const blockRef = ref<HTMLElement | null>(null)

// keep :style bound to a helper (not an inline object) to avoid vue-tsc CSSProperties false positives
function blockStyle(top: number, height: number) {
  return {
    ...(props.themeVars ?? {}),
    top: `${top}px`,
    height: `${Math.max(height, 20)}px`,
  }
}

/** Where inside the block the pointer grabbed it, so drops feel anchored. */
function grabOffsetFrom(clientY: number): number {
  const rect = blockRef.value?.getBoundingClientRect()
  if (!rect) return 0
  return Math.round((clientY - rect.top) / PX_PER_MINUTE)
}

// --- touch: long-press to lift, then drag or open the context menu --------

const { isLifted, onPointerDown } = usePressGesture({
  isEnabled: () => isCoarsePointer.value && !isResizing.value,
  onLift: (point) =>
    emit('touch-lift', {
      taskId: props.task.id,
      grabOffsetMinutes: grabOffsetFrom(point.y),
    }),
  onDragMove: (point) => emit('touch-move', point),
  onDrop: (point) => emit('touch-drop', point),
  onLongPress: (point) =>
    emit('context-menu', { taskId: props.task.id, x: point.x, y: point.y }),
  onCancel: () => emit('touch-cancel'),
})

// --- desktop: native drag and right-click --------------------------------

function onDragStart(event: DragEvent) {
  if (isResizing.value || blockNativeDrag.value) {
    event.preventDefault()
    return
  }

  event.dataTransfer?.setData('text/plain', props.task.id)
  emit('drag-start', {
    taskId: props.task.id,
    grabOffsetMinutes: grabOffsetFrom(event.clientY),
  })
}

function onContextMenu(event: MouseEvent) {
  emit('context-menu', {
    taskId: props.task.id,
    x: event.clientX,
    y: event.clientY,
  })
}

function onResizeHandleDown(event: PointerEvent) {
  event.preventDefault()
  event.stopPropagation()
  isResizing.value = true
  blockNativeDrag.value = true

  const startClientY = event.clientY
  const startMin = minutesFromDayStart(props.task.startTime!)
  const initialDurationMin = minutesFromDayStart(props.task.endTime!) - startMin

  function onMove(moveEvent: PointerEvent) {
    if (!isResizing.value) return
    const deltaMin = Math.round(
      (moveEvent.clientY - startClientY) / PX_PER_MINUTE,
    )
    const newEndMin = clampMinutes(
      startMin +
        Math.max(SNAP_MINUTES, snapMinutes(initialDurationMin + deltaMin)),
    )
    emit('resize', {
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
</script>

<template>
  <div
    ref="blockRef"
    class="cal-event"
    :class="[
      task.priority,
      {
        'is-done': isDone,
        'is-resizing': isResizing,
        'is-lifted': isLifted,
        'is-dragging': isDragging,
      },
    ]"
    :style="blockStyle(topPx, heightPx)"
    :draggable="!isCoarsePointer && !isResizing"
    @dragstart="onDragStart"
    @pointerdown="onPointerDown"
    @click="emit('select', task.id)"
    @contextmenu.prevent="onContextMenu"
  >
    <span class="cal-event__time">{{ task.startTime }}–{{ task.endTime }}</span>
    <span class="cal-event__title">{{ task.title }}</span>
    <div
      class="cal-event__resize-handle"
      @pointerdown="onResizeHandleDown"
      @click.stop
    ></div>
  </div>
</template>
