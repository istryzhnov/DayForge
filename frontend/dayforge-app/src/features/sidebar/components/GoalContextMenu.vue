<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useContextMenu } from '../../../composables/useContextMenu'

const { t } = useI18n()

const props = defineProps<{
  x: number
  y: number
  goalTitle: string
  canMoveUp: boolean
  canMoveDown: boolean
}>()

const emit = defineEmits<{
  (e: 'move', step: -1 | 1): void
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
      v-if="canMoveUp"
      class="goal-settings__item"
      type="button"
      @click="emit('move', -1)"
    >
      {{ t('sidebar.moveUp') }}
    </button>
    <button
      v-if="canMoveDown"
      class="goal-settings__item"
      type="button"
      @click="emit('move', 1)"
    >
      {{ t('sidebar.moveDown') }}
    </button>
    <div v-if="canMoveUp || canMoveDown" class="goal-settings__divider"></div>
    <button
      class="goal-settings__item goal-settings__item--danger"
      type="button"
      @click="emit('delete')"
    >
      {{ t('sidebar.deleteProject') }}
    </button>
  </div>
</template>
