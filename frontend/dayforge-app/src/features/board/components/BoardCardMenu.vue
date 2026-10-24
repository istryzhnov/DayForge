<script setup lang="ts">
import { useContextMenu } from '../../../composables/useContextMenu'

const props = defineProps<{
  x: number
  y: number
  hasNotes: boolean
  isTimerActive: boolean
}>()

const emit = defineEmits<{
  (e: 'add-note'): void
  (e: 'toggle-timer'): void
  (e: 'close'): void
}>()

const { menuPositionStyle } = useContextMenu({
  getPosition: () => ({ x: props.x, y: props.y }),
  onClose: () => emit('close'),
})
</script>

<template>
  <Teleport to="body">
    <div ref="menuRef" class="task-context-menu" :style="menuPositionStyle">
      <button
        class="task-context-menu__item"
        type="button"
        @click="
          () => {
            emit('add-note')
            emit('close')
          }
        "
      >
        {{ hasNotes ? 'Edit note' : 'Add note' }}
      </button>
      <button
        class="task-context-menu__item"
        type="button"
        @click="
          () => {
            emit('toggle-timer')
            emit('close')
          }
        "
      >
        {{ isTimerActive ? 'Stop timer' : 'Start timer' }}
      </button>
    </div>
  </Teleport>
</template>
