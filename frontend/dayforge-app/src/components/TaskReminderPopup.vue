<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { DailyTask } from '../entities/TaskEntity'
import { useFormat } from '../composables/useFormat'
import { useFocusTrap } from '../composables/useFocusTrap'

defineProps<{
  task: DailyTask
  pendingCount: number
}>()

const emit = defineEmits<{
  (e: 'acknowledge'): void
}>()

const { formatTime } = useFormat()
const { t } = useI18n()

/** Escape acknowledges the reminder; the OK button is the first control. */
useFocusTrap({ onEscape: () => emit('acknowledge') })
</script>

<template>
  <div ref="trapRef" class="new-goal-modal task-reminder-modal">
    <div class="modal-overlay"></div>
    <div
      class="modal-card task-reminder-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-reminder-title"
    >
      <p class="task-reminder-card__eyebrow">
        {{ t('tasks.reminderEyebrow') }}
      </p>
      <h3 id="task-reminder-title">{{ task.title }}</h3>
      <p class="task-reminder-card__time">
        {{ t('tasks.reminderStart', { time: formatTime(task.startTime) }) }}
      </p>
      <p v-if="pendingCount > 0" class="task-reminder-card__hint">
        {{ t('tasks.reminderQueued', pendingCount) }}
      </p>
      <div class="modal-actions">
        <button
          type="button"
          class="btn btn-primary"
          @click="emit('acknowledge')"
        >
          {{ t('tasks.reminderOkay') }}
        </button>
      </div>
    </div>
  </div>
</template>
