<script setup lang="ts">
import type { Goal } from '../../../entities/GoalEntity'
import { useIsCoarsePointer } from '../../../composables/useMediaQuery'
import { usePressGesture } from '../../../composables/usePressGesture'

const props = defineProps<{
  goal: Goal
  isActive: boolean
  taskCount: number
}>()

const emit = defineEmits<{
  (e: 'select'): void
  (e: 'context-menu', payload: { goal: Goal; x: number; y: number }): void
}>()

const isCoarsePointer = useIsCoarsePointer()

// Extracted into its own component so every goal owns its gesture instance —
// a single recognizer shared across the v-for would fire for the wrong row.
const { isLifted, onPointerDown } = usePressGesture({
  isEnabled: () => isCoarsePointer.value,
  onLift: (point) =>
    emit('context-menu', { goal: props.goal, x: point.x, y: point.y }),
})

function onContextMenu(event: MouseEvent) {
  emit('context-menu', {
    goal: props.goal,
    x: event.clientX,
    y: event.clientY,
  })
}
</script>

<template>
  <button
    class="nav-goal-btn"
    :class="{ active: isActive, 'is-lifted': isLifted }"
    @click="emit('select')"
    @contextmenu.prevent="onContextMenu"
    @pointerdown="onPointerDown"
  >
    <span>{{ goal.title }}</span>
    <span class="goal-count">{{ taskCount }}</span>
  </button>
</template>
