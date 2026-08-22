<script setup lang="ts">
import type { ID, Priority } from '../../../entities/types'
import type { TaskSchedule } from '../../../entities/TaskEntity'
import type { TaskGroup } from '../../../composables/useTaskTree'
import TaskList from '../../tasks/components/TaskList.vue'

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
  (e: 'delete-task', templateId: ID): void
  (e: 'set-as-project', templateId: ID): void
  (e: 'quick-add', title: string): void
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
    @delete-task="(templateId: ID) => emit('delete-task', templateId)"
    @set-as-project="(templateId: ID) => emit('set-as-project', templateId)"
    @quick-add="(title: string) => emit('quick-add', title)"
  />
</template>
