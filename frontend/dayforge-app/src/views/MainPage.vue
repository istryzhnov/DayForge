<script setup lang="ts">
import { computed, ref } from 'vue'
import GoalComponent from '../features/goals/components/GoalComponent.vue'
import SidebarComponent from '../features/sidebar/components/SidebarComponent.vue'
import CalendarView from '../features/calendar/components/CalendarView.vue'
import TaskReminderPopup from '../components/TaskReminderPopup.vue'
import { useGoalSpace } from '../composables/useGoalSpace'
import { useMainPageState } from '../pages/composables/useMainPageState'
import {
  useTheme,
  type ThemeMode,
  type ThemeStyle,
} from '../composables/useTheme'
import { useTaskNotifications } from '../composables/useTaskNotifications'
import type { ID } from '../entities/types'
import { PRIORITY } from '../entities/constants'

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
  scheduleDailyTask,
  unscheduleDailyTask,
  goToPreviousDay,
  goToNextDay,
  goToToday,
} = goalSpace

const {
  majorTaskOptions,
  handleAddTask,
  handleAddSubTask,
  handleCreateGoal,
  handleToggleMinor,
  handleResolveMajor,
  handleCreateAllModeMinor,
  handleEditTask,
  handleDeleteTask,
  handleDeleteGoal,
  handleChangeGoalColor,
} = useMainPageState(goalSpace)

const { themeStyle, themeMode, setThemeStyle, setThemeMode } = useTheme()

const {
  isSupported: notificationsSupported,
  enabled: notificationsEnabled,
  activeAlert,
  pendingCount,
  enableNotifications,
  disableNotifications,
  acknowledgeAlert,
} = useTaskNotifications(dailyTasks)

function handleToggleNotifications() {
  if (notificationsEnabled.value) {
    disableNotifications()
  } else {
    void enableNotifications()
  }
}

const activeView = ref<'goals' | 'calendar'>('goals')

function handleThemeStyleChange(nextStyle: ThemeStyle) {
  setThemeStyle(nextStyle)
}

function handleThemeModeChange(nextMode: ThemeMode) {
  setThemeMode(nextMode)
}

function handleSelectGoal(goalId: ID | null) {
  activeView.value = 'goals'
  selectGoal(goalId)
}

function handleSelectView(view: 'goals' | 'calendar') {
  activeView.value = view
}

const tasksForCurrentDate = computed(() =>
  dailyTasks.value.filter((task) => task.date === currentDate.value),
)

function handleScheduleTask(payload: {
  taskId: ID
  startTime: string
  endTime: string
}) {
  scheduleDailyTask(payload.taskId, payload.startTime, payload.endTime)
}

function handleCreateScheduledTask(payload: {
  title: string
  startTime: string
  endTime: string
}) {
  const created = goalSpace.addTask(
    activeGoalId.value ?? undefined,
    payload.title,
    PRIORITY.MINOR,
  )
  if (!created) return

  const createdDailyTask = dailyTasks.value.find(
    (task) => task.templateId === created.id && task.date === currentDate.value,
  )
  if (createdDailyTask) {
    scheduleDailyTask(createdDailyTask.id, payload.startTime, payload.endTime)
  }
}

function handleToggleCalendarTaskDone(taskId: ID) {
  handleToggleMinor(taskId)
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
        :active-view="activeView"
        :notifications-supported="notificationsSupported"
        :notifications-enabled="notificationsEnabled"
        @select-goal="handleSelectGoal"
        @create-goal="handleCreateGoal"
        @change-theme-style="handleThemeStyleChange"
        @change-theme-mode="handleThemeModeChange"
        @select-view="handleSelectView"
        @toggle-notifications="handleToggleNotifications"
      />
    </aside>

    <main class="app-content">
      <div class="app-content__inner">
        <GoalComponent
          v-if="activeView === 'goals'"
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
          @edit-task="handleEditTask"
          @delete-task="handleDeleteTask"
          @delete-goal="handleDeleteGoal"
          @change-goal-color="handleChangeGoalColor"
        />

        <CalendarView
          v-else
          :tasks="tasksForCurrentDate"
          :current-date="currentDate"
          @prev-day="goToPreviousDay"
          @next-day="goToNextDay"
          @today="goToToday"
          @schedule-task="handleScheduleTask"
          @unschedule-task="unscheduleDailyTask"
          @create-task="handleCreateScheduledTask"
          @toggle-task-done="handleToggleCalendarTaskDone"
        />
      </div>
    </main>

    <TaskReminderPopup
      v-if="activeAlert"
      :task="activeAlert"
      :pending-count="pendingCount"
      @acknowledge="acknowledgeAlert"
    />
  </div>
</template>
