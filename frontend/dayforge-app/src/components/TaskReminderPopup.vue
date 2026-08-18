<script setup lang="ts">
import type { DailyTask } from '../entities/TaskEntity'

defineProps<{
  task: DailyTask
  pendingCount: number
}>()

const emit = defineEmits<{
  (e: 'acknowledge'): void
}>()
</script>

<template>
  <div class="new-goal-modal task-reminder-modal">
    <div class="modal-overlay"></div>
    <div class="modal-card task-reminder-card">
      <p class="task-reminder-card__eyebrow">Час братися до завдання</p>
      <h3>{{ task.title }}</h3>
      <p class="task-reminder-card__time">Старт о {{ task.startTime }}</p>
      <p v-if="pendingCount > 0" class="task-reminder-card__hint">
        Ще {{ pendingCount }} нагадування в черзі
      </p>
      <div class="modal-actions">
        <button
          type="button"
          class="btn btn-primary"
          @click="emit('acknowledge')"
        >
          Гаразд, бачу ✅
        </button>
      </div>
    </div>
  </div>
</template>
