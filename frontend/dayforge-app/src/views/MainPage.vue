<script setup lang="ts">
import { computed, ref } from 'vue'
import GoalComponent from '../features/goals/components/GoalComponent.vue'
import SidebarComponent from '../features/sidebar/components/SidebarComponent.vue'
import CalendarView from '../features/calendar/components/CalendarView.vue'
import TaskReminderPopup from '../components/TaskReminderPopup.vue'
import PlannedTaskList from '../features/tasks/components/PlannedTaskList.vue'
import { usePlannedTasks } from '../features/tasks/composables/usePlannedTasks'
import { useGoalSpace } from '../composables/useGoalSpace'
import { useMainPageState } from '../pages/composables/useMainPageState'
import {
  useTheme,
  type ThemeMode,
  type ThemeStyle,
} from '../composables/useTheme'
import { useTaskNotifications } from '../composables/useTaskNotifications'
import type { ID } from '../entities/types'
import { PRIORITY, RECURRENCE_TYPE } from '../entities/constants'

const goalSpace = useGoalSpace()

const {
  goals,
  activeGoalId,
  activeGoal,
  selectGoal,
  taskTemplates,
  lastCreatedTemplateId,
  tasksForActiveGoal,
  taskCountByGoal,
  dailyTasks,
  currentDate,
  scheduleDailyTask,
  unscheduleDailyTask,
  goToPreviousDay,
  goToNextDay,
  goToToday,
  goToDate,
} = goalSpace

const {
  majorTaskOptions,
  handleAddTask,
  handleAddSubTask,
  handleCreateGoal,
  handleToggleDone,
  handleTogglePlanned,
  handleSetAsProject,
  handleAttachToProject,
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

type ActiveView = 'goals' | 'calendar' | 'planned'
const activeView = ref<ActiveView>('goals')

const { plannedTasks, plannedCount } = usePlannedTasks({
  getTemplates: () => taskTemplates.value,
  getDailyTasks: () => dailyTasks.value,
  getGoals: () => goals.value,
})

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

function handleSelectView(view: ActiveView) {
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

// Drawn directly on the calendar grid, so it is a one-off on the day in view.
function handleCreateScheduledTask(payload: {
  title: string
  startTime: string
  endTime: string
}) {
  goalSpace.addTask(
    activeGoalId.value ?? undefined,
    payload.title,
    PRIORITY.MINOR,
    {
      date: currentDate.value,
      startTime: payload.startTime,
      endTime: payload.endTime,
      recurrence: {
        type: RECURRENCE_TYPE.NONE,
        startDate: currentDate.value,
      },
    },
  )
}

function handleToggleCalendarTaskDone(taskId: ID) {
  handleToggleDone(taskId)
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
        :planned-count="plannedCount"
        :notifications-supported="notificationsSupported"
        :notifications-enabled="notificationsEnabled"
        @select-goal="handleSelectGoal"
        @create-goal="handleCreateGoal"
        @change-theme-style="handleThemeStyleChange"
        @change-theme-mode="handleThemeModeChange"
        @select-view="handleSelectView"
        @toggle-notifications="handleToggleNotifications"
        @delete-goal="handleDeleteGoal"
      />
    </aside>

    <main class="app-content">
      <div class="app-content__inner">
        <GoalComponent
          v-if="activeView === 'goals'"
          :goal="activeGoal"
          :goals="goals"
          :tasks="tasksForActiveGoal"
          :templates="taskTemplates"
          :new-template-id="lastCreatedTemplateId"
          :daily-tasks="dailyTasks"
          :current-date="currentDate"
          :is-all-mode="activeGoalId === null"
          :major-task-options="majorTaskOptions"
          @add-task="handleAddTask"
          @add-subtask="handleAddSubTask"
          @toggle-done="handleToggleDone"
          @toggle-planned="handleTogglePlanned"
          @set-as-project="handleSetAsProject"
          @create-all-mode-minor="handleCreateAllModeMinor"
          @edit-task="handleEditTask"
          @delete-task="handleDeleteTask"
          @delete-goal="handleDeleteGoal"
          @change-goal-color="handleChangeGoalColor"
        />

        <PlannedTaskList
          v-else-if="activeView === 'planned'"
          :tasks="plannedTasks"
          @toggle="handleTogglePlanned"
        />

        <CalendarView
          v-else
          :tasks="tasksForCurrentDate"
          :current-date="currentDate"
          @prev-day="goToPreviousDay"
          @next-day="goToNextDay"
          @today="goToToday"
          :project-options="majorTaskOptions"
          :daily-tasks="dailyTasks"
          :templates="taskTemplates"
          @select-date="goToDate"
          @schedule-task="handleScheduleTask"
          @unschedule-task="unscheduleDailyTask"
          @create-task="handleCreateScheduledTask"
          @toggle-task-done="handleToggleCalendarTaskDone"
          @edit-task="handleEditTask"
          @attach-to-project="handleAttachToProject"
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
