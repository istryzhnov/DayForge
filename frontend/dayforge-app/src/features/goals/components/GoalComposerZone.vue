<script setup lang="ts">
import { ref } from 'vue'
import type { ID, Priority } from '../../../entities/types'
import type {
  MajorTaskOption,
  TaskSchedule,
} from '../../../entities/TaskEntity'
import type { Goal } from '../../../entities/GoalEntity'
import TaskComposer from '../../tasks/components/TaskComposer.vue'
import AllModeMinorComposer from '../../tasks/components/AllModeMinorComposer.vue'

defineProps<{
  isAllMode: boolean
  goals: Goal[]
  majorTaskOptions: MajorTaskOption[]
}>()

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

const showComposer = ref(false)

function toggleComposer() {
  showComposer.value = !showComposer.value
}
</script>

<template>
  <TaskComposer
    v-if="!isAllMode"
    :is-all-mode="isAllMode"
    @submit="
      (title: string, priority: Priority, schedule?: TaskSchedule) =>
        emit('add-task', title, priority, schedule)
    "
  />

  <template v-else>
    <button
      v-if="!showComposer"
      class="btn btn-ghost composer-toggle-btn"
      type="button"
      @click="toggleComposer"
    >
      + Add task
    </button>

    <div v-else class="composer-collapsible">
      <AllModeMinorComposer
        :goals="goals"
        :major-task-options="majorTaskOptions"
        @create-minor="
          (
            title: string,
            goalId: ID | undefined,
            majorId: ID | undefined,
            schedule?: TaskSchedule,
          ) => {
            emit('create-all-mode-minor', title, goalId, majorId, schedule)
            showComposer = false
          }
        "
      />
      <button
        class="btn btn-ghost composer-collapsible__close"
        type="button"
        @click="toggleComposer"
      >
        Cancel
      </button>
    </div>
  </template>
</template>
