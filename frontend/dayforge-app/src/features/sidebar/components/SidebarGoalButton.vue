<script setup lang="ts">
import { computed } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import AppIcon from '../../../components/AppIcon.vue'
import { useIsCoarsePointer } from '../../../composables/useMediaQuery'
import {
  usePressGesture,
  type GesturePoint,
} from '../../../composables/usePressGesture'
import { goalDropState } from '../../tasks/composables/taskDropTarget'

const props = defineProps<{
  goal: Goal
  isActive: boolean
  /** Listed under the collapsed "Archived" group instead of the main list. */
  isArchived?: boolean
  taskCount: number
  /** The project's own colours, when it has any. */
  themeVars?: Record<string, string>
}>()

const emit = defineEmits<{
  (e: 'select'): void
  (e: 'context-menu', payload: { goal: Goal; x: number; y: number }): void
  /** Touch: held long enough to pick the project up. */
  (e: 'reorder-start', point: GesturePoint): void
  (e: 'reorder-move', point: GesturePoint): void
  /** Touch: released after moving, so the project is dropped here. */
  (e: 'reorder-end', point: GesturePoint): void
  (e: 'reorder-cancel'): void
}>()

const isCoarsePointer = useIsCoarsePointer()

/** Held and released without moving opens the menu; held and moved reorders. */
const { isLifted, onPointerDown } = usePressGesture({
  isEnabled: () => isCoarsePointer.value,
  onLift: (point) => emit('reorder-start', point),
  onDragMove: (point) => emit('reorder-move', point),
  onDrop: (point) => emit('reorder-end', point),
  onLongPress: (point) =>
    emit('context-menu', { goal: props.goal, x: point.x, y: point.y }),
  onCancel: () => emit('reorder-cancel'),
})

/** Only listed projects take a dropped task; archived ones stay out of it. */
const dropAttribute = computed(() =>
  props.isArchived ? undefined : props.goal.id,
)

const isDropCandidate = computed(
  () =>
    !props.isArchived &&
    goalDropState.value.active &&
    goalDropState.value.sourceGoalId !== props.goal.id,
)
const isDropHover = computed(
  () =>
    isDropCandidate.value && goalDropState.value.hoverGoalId === props.goal.id,
)
const isDropFlash = computed(
  () => goalDropState.value.flashGoalId === props.goal.id,
)

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
    :class="{
      active: isActive,
      'is-lifted': isLifted,
      'is-archived': isArchived,
      'is-reorderable': !isArchived,
      'is-drop-candidate': isDropCandidate,
      'is-drop-hover': isDropHover,
      'is-drop-flash': isDropFlash,
    }"
    :style="themeVars"
    :title="isArchived ? undefined : 'Drag to reorder'"
    :data-drop-goal-id="dropAttribute"
    @click="emit('select')"
    @contextmenu.prevent="onContextMenu"
    @pointerdown="onPointerDown"
  >
    <span class="nav-goal-btn__main">
      <!-- Its colour comes from the row's own theme vars, or the app accent. -->
      <span class="nav-goal-btn__lead" aria-hidden="true">
        <span class="nav-goal-btn__dot"></span>
        <!-- Shows on hover in place of the dot; see drag-to-project.css. -->
        <AppIcon
          v-if="!isArchived"
          class="nav-goal-btn__grip"
          name="grip"
          :size="12"
        />
      </span>
      <span class="nav-goal-btn__name">{{ goal.title }}</span>
    </span>
    <span class="goal-count">{{ taskCount }}</span>
  </button>
</template>
