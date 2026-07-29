<script setup lang="ts">
import type { ID, Priority } from '../../../entities/types'
import type { MajorTaskOption } from '../../../entities/TaskEntity'
import type { Goal } from '../../../entities/GoalEntity'
import TaskComposer from '../../tasks/components/TaskComposer.vue'
import AllModeMinorComposer from '../../tasks/components/AllModeMinorComposer.vue'

defineProps<{
  isAllMode: boolean
  goals: Goal[]
  majorTaskOptions: MajorTaskOption[]
}>()

const emit = defineEmits<{
  (e: 'add-task', title: string, priority: Priority): void
  (e: 'create-all-mode-minor', title: string, goalId?: ID, majorId?: ID): void
}>()
</script>

<template>
  <TaskComposer
    v-if="!isAllMode"
    :is-all-mode="isAllMode"
    @submit="(title: string, priority: Priority) => emit('add-task', title, priority)"
  />

  <AllModeMinorComposer
    v-else
    :goals="goals"
    :major-task-options="majorTaskOptions"
    @create-minor="
      (title: string, goalId: ID | undefined, majorId: ID | undefined) =>
        emit('create-all-mode-minor', title, goalId, majorId)
    "
  />
</template>
