<script setup lang="ts">
import GoalComponent from '../features/goals/components/GoalComponent.vue'
import SidebarComponent from '../features/sidebar/components/SidebarComponent.vue'
import { useGoalSpace } from '../composables/useGoalSpace'
import { useMainPageState } from '../pages/composables/useMainPageState'

const goalSpace = useGoalSpace()

const {
  goals,
  activeGoalId,
  activeGoal,
  selectGoal,
  taskTemplates,
  tasksForActiveGoal,
  taskCountByGoal,
} = goalSpace

const {
  majorTaskOptions,
  handleAddTask,
  handleAddSubTask,
  handleCreateGoal,
  handleToggleMinor,
  handleResolveMajor,
  handleCreateAllModeMinor,
} = useMainPageState(goalSpace)
</script>

<template>
  <div class="app-shell">
    <aside class="app-sidebar">
      <SidebarComponent
        :goals="goals"
        :active-goal-id="activeGoalId"
        :task-count-by-goal="taskCountByGoal"
        :total-task-count="taskTemplates.length"
        @select-goal="selectGoal"
        @create-goal="handleCreateGoal"
      />
    </aside>

    <main class="app-content">
      <GoalComponent
        :goal="activeGoal"
        :goals="goals"
        :tasks="tasksForActiveGoal"
        :is-all-mode="activeGoalId === null"
        :major-task-options="majorTaskOptions"
        @add-task="handleAddTask"
        @add-subtask="handleAddSubTask"
        @toggle-minor="handleToggleMinor"
        @resolve-major="handleResolveMajor"
        @create-all-mode-minor="handleCreateAllModeMinor"
      />
    </main>
  </div>
</template>
