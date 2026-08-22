<script setup lang="ts">
import { useContextMenu } from '../../../composables/useContextMenu'

const props = defineProps<{
  x: number
  y: number
  goalTitle: string
}>()

const emit = defineEmits<{
  (e: 'delete'): void
  (e: 'close'): void
}>()

const { menuPositionStyle } = useContextMenu({
  getPosition: () => ({ x: props.x, y: props.y }),
  onClose: () => emit('close'),
})
</script>

<template>
  <div ref="menuRef" class="goal-context-menu" :style="menuPositionStyle">
    <p class="goal-context-menu__title">{{ goalTitle }}</p>
    <div class="goal-settings__divider"></div>
    <button
      class="goal-settings__item goal-settings__item--danger"
      type="button"
      @click="emit('delete')"
    >
      Delete goal
    </button>
  </div>
</template>
