<script setup lang="ts">
import { useContextMenu } from '../../../composables/useContextMenu'

const props = defineProps<{
  x: number
  y: number
  isDone: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-check'): void
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
          emit('toggle-check')
          emit('close')
        }
      "
    >
      {{ isDone ? 'Mark as not done' : 'Mark as done' }}
    </button>
  </div>
</template>
