<script setup lang="ts">
import type { Goal } from '../entities/GoalEntity'
import type { DailyTask, MajorDecision } from '../entities/TaskEntity'
import type { ID, Priority } from '../entities/types'
import GoalHeader from './GoalHeader.vue'
import TaskComposer from './TaskComposer.vue'
import TaskList from './TaskList.vue'
import { useTaskTree } from '../composable/useTaskTree'
import { ref } from 'vue'
import AllModeMinorComposer from './AllModeMinorComposer.vue'

type MajorTaskOption = {
  id: ID
  title: string
  goalTitle: string
}
const props = defineProps<{
  goal: Goal | null
  goals: Goal[]
  tasks: DailyTask[]
  isAllMode: boolean
  majorTaskOptions: MajorTaskOption[]
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
  (e: 'attach-minor-task', majorTemplateId: ID, title: string): void
  (
    e: 'create-major-with-minor',
    goalId: ID,
    majorTitle: string,
    minorTitle: string,
  ): void
}>()

const showMajorTasks = ref(true)

const {
  orderedFlatNodes,
  totalCount,
  majorCount,
  subCount,
  panelTitle,
  panelDescription,
} = useTaskTree(props, showMajorTasks)
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

    <label v-if="isAllMode" class="major-toggle">
      <input type="checkbox" v-model="showMajorTasks" />
      Show major tasks
    </label>

    <TaskComposer
      v-if="!isAllMode"
      :is-all-mode="isAllMode"
      @submit="(title, priority) => emit('add-task', title, priority)"
    />

    <AllModeMinorComposer
      v-else
      :goals="goals"
      :major-task-options="majorTaskOptions"
      @attach-minor="
        (majorTemplateId, title) =>
          emit('attach-minor-task', majorTemplateId, title)
      "
      @create-major-and-minor="
        (goalId, majorTitle, minorTitle) =>
          emit('create-major-with-minor', goalId, majorTitle, minorTitle)
      "
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
