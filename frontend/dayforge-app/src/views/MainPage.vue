<script setup lang="ts">
import GoalComponent from '../features/goals/components/GoalComponent.vue'
import SidebarComponent from '../features/sidebar/components/SidebarComponent.vue'
import CalendarView from '../features/calendar/components/CalendarView.vue'
import TaskReminderPopup from '../components/TaskReminderPopup.vue'
import PlannedTaskList from '../features/tasks/components/PlannedTaskList.vue'
import ArchiveView from '../features/tasks/components/ArchiveView.vue'
import OnboardingHints from '../features/onboarding/components/OnboardingHints.vue'
import StarterTemplateModal from '../features/onboarding/components/StarterTemplateModal.vue'
import UndoToast from '../components/UndoToast.vue'
import SettingsSidebar from '../features/settings/components/SettingsSidebar.vue'
import { useGoalSpace } from '../composables/useGoalSpace'
import { useMainPageState } from '../pages/composables/useMainPageState'
import { useSettingsPanel } from '../features/settings/composables/useSettingsPanel'

const goalSpace = useGoalSpace()

const {
  goals,
  activeGoalId,
  activeGoal,
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
  activeView,
  selectView,
  selectGoal,
  isFirstRun,
  showStarter,
  openStarter,
  closeStarter,
  handleApplyStarter,
  tasksForCurrentDate,
  goalVarsById,
  plannedTasks,
  plannedCount,
  archiveBlocks,
  totalDone,
  notificationsSupported,
  notificationsEnabled,
  activeAlert,
  pendingCount,
  acknowledgeAlert,
  toggleNotifications,
  dataStats,
  exportData,
  importData,
  clearData,
  majorTaskOptions,
  handleAddTask,
  handleAddSubTask,
  handleCreateGoal,
  handleToggleDone,
  handleTogglePlanned,
  handleSetAsProject,
  handleAttachToProject,
  handleAssignTaskToGoal,
  handleCreateAllModeMinor,
  handleCreateScheduledTask,
  handleEditTask,
  handleDeleteTask,
  handleDeleteGoal,
  handleChangeGoalColor,
  handleChangeGoalTheme,
} = useMainPageState(goalSpace)

const { isOpen: isSettingsOpen } = useSettingsPanel()
</script>

<template>
  <div class="app-shell" :class="{ 'is-settings-open': isSettingsOpen }">
    <aside class="app-sidebar">
      <SidebarComponent
        :goals="goals"
        :active-goal-id="activeGoalId"
        :task-count-by-goal="taskCountByGoal"
        :total-task-count="taskTemplates.length"
        :goal-vars-by-id="goalVarsById"
        :active-view="activeView"
        :planned-count="plannedCount"
        :done-count="totalDone"
        :notifications-supported="notificationsSupported"
        :notifications-enabled="notificationsEnabled"
        @select-goal="selectGoal"
        @create-goal="handleCreateGoal"
        @select-view="selectView"
        @toggle-notifications="toggleNotifications"
        @delete-goal="handleDeleteGoal"
      />
    </aside>

    <main class="app-content">
      <div class="app-content__inner">
        <OnboardingHints
          v-if="isFirstRun && activeView === 'goals'"
          @open-starter="openStarter"
        />

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

        <ArchiveView
          v-else-if="activeView === 'archive'"
          :blocks="archiveBlocks"
          :total-done="totalDone"
        />

        <CalendarView
          v-else
          :tasks="tasksForCurrentDate"
          :current-date="currentDate"
          :project-options="majorTaskOptions"
          :daily-tasks="dailyTasks"
          :templates="taskTemplates"
          :goal-vars-by-id="goalVarsById"
          :goals="goals"
          @prev-day="goToPreviousDay"
          @next-day="goToNextDay"
          @today="goToToday"
          @select-date="goToDate"
          @schedule-task="
            (payload) =>
              scheduleDailyTask(
                payload.taskId,
                payload.startTime,
                payload.endTime,
              )
          "
          @unschedule-task="unscheduleDailyTask"
          @create-task="handleCreateScheduledTask"
          @toggle-task-done="handleToggleDone"
          @edit-task="handleEditTask"
          @attach-to-project="handleAttachToProject"
          @assign-goal="handleAssignTaskToGoal"
        />
      </div>
    </main>

    <!-- Sits to the right of everything: its own column on a wide screen, an
         overlay drawer once the shell runs out of room. -->
    <aside v-if="isSettingsOpen" class="app-settings">
      <SettingsSidebar
        :active-goal="activeGoal"
        :notifications-supported="notificationsSupported"
        :notifications-enabled="notificationsEnabled"
        :data-stats="dataStats"
        @change-goal-theme="handleChangeGoalTheme"
        @toggle-notifications="toggleNotifications"
        @export-data="exportData"
        @import-data="importData"
        @clear-data="clearData"
        @open-starter="openStarter"
      />
    </aside>

    <StarterTemplateModal
      v-if="showStarter"
      @apply="handleApplyStarter"
      @close="closeStarter"
    />

    <UndoToast />

    <TaskReminderPopup
      v-if="activeAlert"
      :task="activeAlert"
      :pending-count="pendingCount"
      @acknowledge="acknowledgeAlert"
    />
  </div>
</template>
