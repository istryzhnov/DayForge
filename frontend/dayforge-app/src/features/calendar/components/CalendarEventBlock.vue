<script setup lang="ts">
import type { DailyTask } from '../../../entities/TaskEntity'
import type { ID } from '../../../entities/types'
import type { GesturePoint } from '../../../composables/usePressGesture'
import { useCalendarEventBlock } from '../composables/useCalendarEventBlock'

const props = defineProps<{
  task: DailyTask
  topPx: number
  heightPx: number
  isDragging?: boolean
  /** Its project's colours, when the project has its own. */
  themeVars?: Record<string, string>
  /** Left/width once overlapping blocks have been split into columns. */
  columnStyle?: Record<string, string>
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

const {
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
} = useCalendarEventBlock(props, {
  onDragStart: (payload) => emit('drag-start', payload),
  onResize: (payload) => emit('resize', payload),
  onContextMenu: (payload) => emit('context-menu', payload),
  onTouchLift: (payload) => emit('touch-lift', payload),
  onTouchMove: (point) => emit('touch-move', point),
  onTouchDrop: (point) => emit('touch-drop', point),
  onTouchCancel: () => emit('touch-cancel'),
})
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
    :draggable="isDraggable"
    @dragstart="onDragStart"
    @pointerdown="onPointerDown"
    @click="emit('select', task.id)"
    @contextmenu.prevent="onContextMenu"
  >
    <span class="cal-event__time">
      {{ formatTime(task.startTime) }}–{{ formatTime(task.endTime) }}
    </span>
    <span class="cal-event__title">{{ task.title }}</span>
    <div
      class="cal-event__resize-handle"
      @pointerdown="onResizeHandleDown"
      @click.stop
    ></div>
  </div>
</template>
