<script setup lang="ts">
import { computed } from 'vue'
import type { ID, Priority } from '../../../entities/types'
import type { TaskSchedule } from '../../../entities/TaskEntity'
import TaskComposer from '../../tasks/components/TaskComposer.vue'
import { useSettings } from '../../../composables/useSettings'

const props = defineProps<{
  isAllMode: boolean
}>()

const { settings } = useSettings()
const keyboardShortcuts = computed(() => settings.behavior.keyboardShortcuts)

const emit = defineEmits<{
  (
    e: 'add-task',
    title: string,
    priority: Priority,
    schedule?: TaskSchedule,
  ): void
  (
    e: 'create-all-mode-minor',
    title: string,
    goalId?: ID,
    majorId?: ID,
    schedule?: TaskSchedule,
  ): void
}>()

// All Tasks has no project to add into, so its row creates an unassigned task.
function onSubmit(title: string, priority: Priority, schedule?: TaskSchedule) {
  if (props.isAllMode) emit('create-all-mode-minor', title, undefined, undefined, schedule)
  else emit('add-task', title, priority, schedule)
}
</script>

<template>
  <TaskComposer
    :shortcut="isAllMode && keyboardShortcuts"
    @submit="onSubmit"
  />
</template>
