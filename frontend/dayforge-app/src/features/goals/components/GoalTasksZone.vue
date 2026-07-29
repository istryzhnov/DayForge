<script setup lang="ts">
import type { ID, Priority } from '../../../entities/types'
import type { MajorDecision } from '../../../entities/TaskEntity'
import type { FlatTaskNode } from '../../../composables/useTaskTree'
import TaskList from '../../tasks/components/TaskList.vue'

defineProps<{
  nodes: FlatTaskNode[]
  isAllMode: boolean
}>()

const emit = defineEmits<{
  (
    e: 'add-subtask',
    parentTemplateId: ID,
    title: string,
    priority: Priority,
  ): void
  (e: 'toggle-minor', dailyTaskId: ID): void
  (e: 'resolve-major', dailyMajorTaskId: ID, decision: MajorDecision): void
  (e: 'focus-major', dailyMajorTaskId: ID): void
}>()
</script>

<template>
  <TaskList
    :nodes="nodes"
    :is-all-mode="isAllMode"
    @add-subtask="
      (parentId: ID, title: string, priority: Priority) =>
        emit('add-subtask', parentId, title, priority)
    "
    @toggle-minor="(dailyTaskId: ID) => emit('toggle-minor', dailyTaskId)"
    @resolve-major="
      (dailyMajorTaskId: ID, decision: MajorDecision) =>
        emit('resolve-major', dailyMajorTaskId, decision)
    "
    @focus-major="(majorId: ID) => emit('focus-major', majorId)"
  />
</template>
