<script setup lang="ts">
import type { DailyTask } from '../../../entities/TaskEntity'
import type { ID } from '../../../entities/types'
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
}>()

const emit = defineEmits<{
  (e: 'select', taskId: ID): void
  (e: 'drag-start', payload: { taskId: ID; grabOffsetMinutes: number }): void
  (e: 'resize', payload: { taskId: ID; endTime: string }): void
}>()

// keep :style bound to a helper (not an inline object) to avoid vue-tsc CSSProperties false positives
function blockStyle(top: number, height: number) {
  return {
    top: `${top}px`,
    height: `${Math.max(height, 20)}px`,
  }
}

function onDragStart(event: DragEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const grabOffsetMinutes = Math.round(
    (event.clientY - rect.top) / PX_PER_MINUTE,
  )
  event.dataTransfer?.setData('text/plain', props.task.id)
  emit('drag-start', { taskId: props.task.id, grabOffsetMinutes })
}

let resizing = false

function onResizeHandleDown(event: PointerEvent) {
  event.stopPropagation()
  resizing = true
  const startClientY = event.clientY
  const startMin = minutesFromDayStart(props.task.startTime!)
  const initialDurationMin = minutesFromDayStart(props.task.endTime!) - startMin

  function onMove(moveEvent: PointerEvent) {
    if (!resizing) return
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
    resizing = false
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
    :class="task.priority"
    :style="blockStyle(topPx, heightPx)"
    draggable="true"
    @dragstart="onDragStart"
    @click="emit('select', task.id)"
  >
    <span class="cal-event__time">{{ task.startTime }}–{{ task.endTime }}</span>
    <span class="cal-event__title">{{ task.title }}</span>
    <div
      class="cal-event__resize-handle"
      @pointerdown="onResizeHandleDown"
    ></div>
  </div>
</template>
