<script setup lang="ts">
import type { TaskSchedule } from '../../../entities/TaskEntity'
import TaskScheduleFields from './TaskScheduleFields.vue'
import { useTaskQuickAdd } from '../composables/useTaskQuickAdd'

const emit = defineEmits<{
  (e: 'submit', title: string, schedule?: TaskSchedule): void
}>()

const { title, submit } = useTaskQuickAdd({
  onSubmit: (nextTitle, schedule) => emit('submit', nextTitle, schedule),
})
</script>

<template>
  <!-- Shown instead of an empty-state message: with nothing to look at, the
       useful thing to offer is the one field needed to get started. -->
  <div class="task-quick-add">
    <p class="task-quick-add__hint">
      Nothing planned yet — add your first task.
    </p>
    <div class="task-quick-add__row">
      <input
        v-model="title"
        type="text"
        placeholder="Task title"
        @keydown.enter="submit"
      />
      <button class="btn btn-primary" type="button" @click="submit">
        Add task
      </button>
    </div>

    <TaskScheduleFields ref="scheduleFields" />
  </div>
</template>
