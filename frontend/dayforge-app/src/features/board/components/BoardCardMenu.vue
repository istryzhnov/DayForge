<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useContextMenu } from '../../../composables/useContextMenu'

const { t } = useI18n()

const props = defineProps<{
  x: number
  y: number
  hasNotes: boolean
  isTimerActive: boolean
}>()

const emit = defineEmits<{
  (e: 'add-note'): void
  (e: 'toggle-timer'): void
  (e: 'delete'): void
  (e: 'close'): void
}>()

const { menuPositionStyle } = useContextMenu({
  getPosition: () => ({ x: props.x, y: props.y }),
  onClose: () => emit('close'),
})
</script>

<template>
  <Teleport to="body">
    <div
      ref="menuRef"
      class="task-context-menu"
      role="menu"
      :aria-label="t('common.actions')"
      :style="menuPositionStyle"
    >
      <button
        role="menuitem"
        class="task-context-menu__item"
        type="button"
        @click="
          () => {
            emit('add-note')
            emit('close')
          }
        "
      >
        {{ hasNotes ? t('tasks.editNote') : t('tasks.addNote') }}
      </button>
      <button
        role="menuitem"
        class="task-context-menu__item"
        type="button"
        @click="
          () => {
            emit('toggle-timer')
            emit('close')
          }
        "
      >
        {{ isTimerActive ? t('tasks.stopTimer') : t('tasks.startTimer') }}
      </button>
      <button
        role="menuitem"
        class="task-context-menu__item task-context-menu__item--danger"
        type="button"
        @click="
          () => {
            emit('delete')
            emit('close')
          }
        "
      >
        {{ t('common.delete') }}
      </button>
    </div>
  </Teleport>
</template>
