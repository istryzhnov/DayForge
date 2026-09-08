<script setup lang="ts">
import { useContextMenu } from '../../../composables/useContextMenu'

const props = defineProps<{
  x: number
  y: number
  isDone: boolean
  canSetAsProject: boolean
  canAddChild: boolean
  isProject: boolean
  /** Only a task without a parent can pick a new home. */
  canMove: boolean
  /** Already on the calendar, so the entry offers to change it instead. */
  isScheduled: boolean
  /** Billing at its own rate, so the entry offers to change it instead. */
  hasOwnRate: boolean
}>()

const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'schedule'): void
  (e: 'set-rate'): void
  (e: 'move'): void
  (e: 'delete'): void
  (e: 'add-to-this'): void
  (e: 'toggle-check'): void
  (e: 'set-as-project'): void
  (e: 'show-habit'): void
  (e: 'close'): void
}>()

const { menuPositionStyle } = useContextMenu({
  getPosition: () => ({ x: props.x, y: props.y }),
  onClose: () => emit('close'),
})
</script>

<template>
  <div ref="menuRef" class="task-context-menu" :style="menuPositionStyle">
    <button
      class="task-context-menu__item"
      type="button"
      @click="
        () => {
          emit('edit')
          emit('close')
        }
      "
    >
      Edit
    </button>
    <button
      class="task-context-menu__item"
      type="button"
      @click="
        () => {
          emit('toggle-check')
          emit('close')
        }
      "
    >
      {{ isDone ? 'Mark as not done' : 'Check it' }}
    </button>
    <button
      v-if="canMove"
      class="task-context-menu__item"
      type="button"
      @click="
        () => {
          emit('move')
          emit('close')
        }
      "
    >
      Move to…
    </button>
    <button
      v-if="canSetAsProject"
      class="task-context-menu__item"
      type="button"
      @click="
        () => {
          emit('set-as-project')
          emit('close')
        }
      "
    >
      Set as project
    </button>
    <button
      v-if="canAddChild"
      class="task-context-menu__item"
      type="button"
      @click="
        () => {
          emit('add-to-this')
          emit('close')
        }
      "
    >
      Add to this
    </button>
    <button
      v-if="isProject"
      class="task-context-menu__item"
      type="button"
      @click="
        () => {
          emit('show-habit')
          emit('close')
        }
      "
    >
      Show habit
    </button>
    <button
      class="task-context-menu__item"
      type="button"
      @click="
        () => {
          emit('schedule')
          emit('close')
        }
      "
    >
      {{ isScheduled ? 'Change the time' : 'Add to calendar' }}
    </button>
    <button
      class="task-context-menu__item"
      type="button"
      @click="
        () => {
          emit('set-rate')
          emit('close')
        }
      "
    >
      {{ hasOwnRate ? 'Change the rate…' : 'Set rate…' }}
    </button>
    <div class="task-context-menu__divider"></div>
    <button
      class="task-context-menu__item task-context-menu__item--danger"
      type="button"
      @click="
        () => {
          emit('delete')
          emit('close')
        }
      "
    >
      Delete
    </button>
  </div>
</template>
