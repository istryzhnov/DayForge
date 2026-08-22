<script setup lang="ts">
import type { DailyTask } from '../../../entities/TaskEntity'
import type { ID } from '../../../entities/types'
import { useIsCoarsePointer } from '../../../composables/useMediaQuery'
import {
  usePressGesture,
  type GesturePoint,
} from '../../../composables/usePressGesture'

const props = defineProps<{
  task: DailyTask
  /** Its project's colours, when the project has its own. */
  themeVars?: Record<string, string>
}>()

const emit = defineEmits<{
  (e: 'drag-start', event: DragEvent, taskId: ID): void
  (e: 'touch-lift', taskId: ID): void
  (e: 'touch-move', point: GesturePoint): void
  (e: 'touch-drop', point: GesturePoint): void
  (e: 'touch-cancel'): void
  (e: 'context-menu', payload: { taskId: ID; x: number; y: number }): void
}>()

const isCoarsePointer = useIsCoarsePointer()

const { isLifted, onPointerDown } = usePressGesture({
  isEnabled: () => isCoarsePointer.value,
  onLift: () => emit('touch-lift', props.task.id),
  onDragMove: (point) => emit('touch-move', point),
  onDrop: (point) => emit('touch-drop', point),
  onLongPress: (point) =>
    emit('context-menu', { taskId: props.task.id, x: point.x, y: point.y }),
  onCancel: () => emit('touch-cancel'),
})
</script>

<template>
  <div
    class="calendar-view__unscheduled-item"
    :class="[task.priority, { 'is-lifted': isLifted }]"
    :style="themeVars"
    :draggable="!isCoarsePointer"
    @dragstart="emit('drag-start', $event, task.id)"
    @pointerdown="onPointerDown"
    @contextmenu.prevent="
      emit('context-menu', {
        taskId: task.id,
        x: $event.clientX,
        y: $event.clientY,
      })
    "
  >
    {{ task.title }}
  </div>
</template>
