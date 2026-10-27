<script setup lang="ts">
import type { ID, Priority } from '../../../entities/types'
import type { TaskSchedule } from '../../../entities/TaskEntity'
import type { TaskGroup } from '../../../composables/useTaskTree'
import TaskList from '../../tasks/components/TaskList.vue'
import type { TaskDropPayload } from '../../tasks/composables/useTaskDrag'

defineProps<{
  groups: TaskGroup[]
  isAllMode: boolean
}>()

const emit = defineEmits<{
  (
    e: 'add-subtask',
    parentTemplateId: ID,
    title: string,
    priority: Priority,
    schedule?: TaskSchedule,
  ): void
  (e: 'toggle-done', dailyTaskId: ID): void
  (e: 'focus-project', dailyTaskId: ID): void
  (e: 'edit-task', templateId: ID, title: string): void
  (e: 'edit-notes', templateId: ID, notes: string): void
  (e: 'schedule-task', templateId: ID, schedule: TaskSchedule | null): void
  (e: 'set-task-rate', templateId: ID, hourlyRate: number | undefined): void
  (e: 'delete-task', templateId: ID): void
  (e: 'set-as-project', templateId: ID): void
  (e: 'move-task', templateId: ID): void
  (e: 'move-task-to', payload: TaskDropPayload): void
}>()
</script>

<template>
  <TaskList
    :groups="groups"
    :is-all-mode="isAllMode"
    @add-subtask="
      (
        parentId: ID,
        title: string,
        priority: Priority,
        schedule?: TaskSchedule,
      ) => emit('add-subtask', parentId, title, priority, schedule)
    "
    @toggle-done="(dailyTaskId: ID) => emit('toggle-done', dailyTaskId)"
    @focus-project="(taskId: ID) => emit('focus-project', taskId)"
    @edit-task="
      (templateId: ID, title: string) => emit('edit-task', templateId, title)
    "
    @edit-notes="
      (templateId: ID, notes: string) => emit('edit-notes', templateId, notes)
    "
    @schedule-task="
      (templateId: ID, schedule: TaskSchedule | null) =>
        emit('schedule-task', templateId, schedule)
    "
    @set-task-rate="
      (templateId: ID, hourlyRate: number | undefined) =>
        emit('set-task-rate', templateId, hourlyRate)
    "
    @delete-task="(templateId: ID) => emit('delete-task', templateId)"
    @set-as-project="(templateId: ID) => emit('set-as-project', templateId)"
    @move-task="(templateId: ID) => emit('move-task', templateId)"
    @move-task-to="(payload: TaskDropPayload) => emit('move-task-to', payload)"
  />
</template>
