<script setup lang="ts">
import GoalComponent from '../features/goals/components/GoalComponent.vue'
import SidebarComponent from '../features/sidebar/components/SidebarComponent.vue'
import { useGoalSpace } from '../composables/useGoalSpace'
import { useMainPageState } from '../pages/composables/useMainPageState'
import {
  useTheme,
  type ThemeMode,
  type ThemeStyle,
} from '../composables/useTheme'

const goalSpace = useGoalSpace()

const {
  goals,
  activeGoalId,
  activeGoal,
  selectGoal,
  taskTemplates,
  tasksForActiveGoal,
  taskCountByGoal,
  dailyTasks,
  currentDate,
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

const { themeStyle, themeMode, setThemeStyle, setThemeMode } = useTheme()

function handleThemeStyleChange(nextStyle: ThemeStyle) {
  setThemeStyle(nextStyle)
}

function handleThemeModeChange(nextMode: ThemeMode) {
  setThemeMode(nextMode)
}
</script>

<template>
  <div class="app-shell">
    <aside class="app-sidebar">
      <SidebarComponent
        :goals="goals"
        :active-goal-id="activeGoalId"
        :task-count-by-goal="taskCountByGoal"
        :total-task-count="taskTemplates.length"
        :theme-style="themeStyle"
        :theme-mode="themeMode"
        @select-goal="selectGoal"
        @create-goal="handleCreateGoal"
        @change-theme-style="handleThemeStyleChange"
        @change-theme-mode="handleThemeModeChange"
      />
    </aside>

    <main class="app-content">
      <GoalComponent
        :goal="activeGoal"
        :goals="goals"
        :tasks="tasksForActiveGoal"
        :daily-tasks="dailyTasks"
        :current-date="currentDate"
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
