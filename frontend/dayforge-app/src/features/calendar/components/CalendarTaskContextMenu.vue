<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useContextMenu } from '../../../composables/useContextMenu'

const { t } = useI18n()

const props = defineProps<{
  x: number
  y: number
  isDone: boolean
  /** Running on this task, so the entry offers to stop it instead. */
  isTimerActive: boolean
  /** A finished, scheduled block with no time logged over it yet. */
  canLogPlanned?: boolean
  /** Placed on the grid, so it can go back to the unscheduled list. */
  canUnschedule?: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-check'): void
  (e: 'toggle-timer'): void
  (e: 'log-planned'): void
  (e: 'unschedule'): void
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
      {{ isDone ? t('calendar.markNotDone') : t('calendar.markDone') }}
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
      {{ isTimerActive ? t('calendar.stopTimer') : t('calendar.startTimer') }}
    </button>
    <button
      v-if="canLogPlanned"
      class="task-context-menu__item"
      type="button"
      @click="
        () => {
          emit('log-planned')
          emit('close')
        }
      "
    >
      {{ t('calendar.logPlanned') }}
    </button>
    <button
      v-if="canUnschedule"
      class="task-context-menu__item"
      type="button"
      @click="
        () => {
          emit('unschedule')
          emit('close')
        }
      "
    >
      {{ t('calendar.unschedule') }}
    </button>
  </div>
</template>
