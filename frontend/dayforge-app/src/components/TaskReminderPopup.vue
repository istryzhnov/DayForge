<script setup lang="ts">
import type { DailyTask } from '../entities/TaskEntity'
import { useFormat } from '../composables/useFormat'

defineProps<{
  task: DailyTask
  pendingCount: number
}>()

const emit = defineEmits<{
  (e: 'acknowledge'): void
}>()

const { formatTime } = useFormat()
</script>

<template>
  <div class="new-goal-modal task-reminder-modal">
    <div class="modal-overlay"></div>
    <div class="modal-card task-reminder-card">
      <p class="task-reminder-card__eyebrow">Time to make it</p>
      <h3>{{ task.title }}</h3>
      <p class="task-reminder-card__time">
        Start at {{ formatTime(task.startTime) }}
      </p>
      <p v-if="pendingCount > 0" class="task-reminder-card__hint">
        {{ pendingCount }} notification in queue
      </p>
      <div class="modal-actions">
        <button
          type="button"
          class="btn btn-primary"
          @click="emit('acknowledge')"
        >
          Okay ✅
        </button>
      </div>
    </div>
  </div>
</template>
