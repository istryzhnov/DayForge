<script setup lang="ts">
import type { Goal } from '../entities/GoalEntity'
import type { DailyTask, MajorDecision } from '../entities/TaskEntity'
import type { ID, Priority } from '../entities/types'
import GoalHeader from './GoalHeader.vue'
import TaskComposer from './TaskComposer.vue'
import TaskList from './TaskList.vue'
import { useTaskTree } from '../composable/useTaskTree'

const props = defineProps<{
  goal: Goal | null
  goals: Goal[]
  tasks: DailyTask[]
  isAllMode: boolean
}>()

const emit = defineEmits<{
  (e: 'add-task', title: string, priority: Priority): void
  (
    e: 'add-subtask',
    parentTemplateId: ID,
    title: string,
    priority: Priority,
  ): void
  (e: 'toggle-minor', dailyTaskId: ID): void
  (e: 'resolve-major', dailyMajorTaskId: ID, decision: MajorDecision): void
}>()

const {
  orderedFlatNodes,
  totalCount,
  majorCount,
  subCount,
  panelTitle,
  panelDescription,
} = useTaskTree(props)
</script>

<template>
  <section class="goal-panel">
    <GoalHeader
      :title="panelTitle"
      :description="panelDescription"
      :status="isAllMode ? 'overview' : (goal?.status ?? 'active')"
      :total-count="totalCount"
      :major-count="majorCount"
      :sub-count="subCount"
    />

    <TaskComposer
      :is-all-mode="isAllMode"
      @submit="(title, priority) => emit('add-task', title, priority)"
    />

    <TaskList
      :nodes="orderedFlatNodes"
      :is-all-mode="isAllMode"
      @add-subtask="
        (parentId, title, priority) =>
          emit('add-subtask', parentId, title, priority)
      "
      @toggle-minor="(dailyTaskId) => emit('toggle-minor', dailyTaskId)"
      @resolve-major="
        (dailyMajorTaskId, decision) =>
          emit('resolve-major', dailyMajorTaskId, decision)
      "
    />
  </section>
</template>
