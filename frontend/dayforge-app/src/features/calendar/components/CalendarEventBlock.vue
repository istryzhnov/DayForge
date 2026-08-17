<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DailyTask } from '../../../entities/TaskEntity'
import type { ID } from '../../../entities/types'
import { TASK_STATUS } from '../../../entities/constants'
import {
  PX_PER_MINUTE,
  SNAP_MINUTES,
  clampMinutes,
  minutesFromDayStart,
  snapMinutes,
  timeFromMinutes,
} from '../composables/useCalendarGrid'
import { transform } from 'typescript'

const props = defineProps<{
  task: DailyTask
  topPx: number
  heightPx: number
}>()

const emit = defineEmits<{
  (e: 'select', taskId: ID): void
  (e: 'drag-start', payload: { taskId: ID; grabOffsetMinutes: number }): void
  (e: 'resize', payload: { taskId: ID; endTime: string }): void
  (e: 'context-menu', payload: { taskId: ID; x: number; y: number }): void
  (e: 'touch-drag-end', payload: { taskId: ID; clientY: number }): void
}>()

const isCoarsePointer =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(pointer: coarse)').matches

// keep :style bound to a helper (not an inline object) to avoid vue-tsc CSSProperties false positives
function blockStyle(top: number, height: number) {
  return {
    top: `${top}px`,
    height: `${Math.max(height, 20)}px`,
    transform: isTouchDragging.value,
  }
}

function onDragStart(event: DragEvent) {
  if (isResizing.value || blockNativeDrag.value) {
    event.preventDefault()
    return
  }

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const grabOffsetMinutes = Math.round(
    (event.clientY - rect.top) / PX_PER_MINUTE,
  )
  event.dataTransfer?.setData('text/plain', props.task.id)
  emit('drag-start', { taskId: props.task.id, grabOffsetMinutes })
}

const isDone = computed(() => props.task.status === TASK_STATUS.DONE)
const isResizing = ref(false)
const blockNativeDrag = ref(false)

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
    class="cal-event"
    :class="[task.priority, { 'is-done': isDone, 'is-resizing': isResizing }]"
    :style="blockStyle(topPx, heightPx)"
    :draggable="!isResizing"
    @dragstart="onDragStart"
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
