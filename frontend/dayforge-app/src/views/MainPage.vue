<script setup lang="ts">
import GoalComponent from '../features/goals/components/GoalComponent.vue'
import SidebarComponent from '../features/sidebar/components/SidebarComponent.vue'
import MobileTopBar from '../features/sidebar/components/MobileTopBar.vue'
import { useMobileNav } from '../features/sidebar/composables/useMobileNav'
import CalendarView from '../features/calendar/components/CalendarView.vue'
import TaskReminderPopup from '../components/TaskReminderPopup.vue'
import PlannedTaskList from '../features/tasks/components/PlannedTaskList.vue'
import ArchiveView from '../features/tasks/components/ArchiveView.vue'
import TimerView from '../features/timer/components/TimerView.vue'
import AnalyticsView from '../features/analytics/components/AnalyticsView.vue'
import OnboardingHints from '../features/onboarding/components/OnboardingHints.vue'
import StarterTemplateModal from '../features/onboarding/components/StarterTemplateModal.vue'
import UndoToast from '../components/UndoToast.vue'
import ShortcutTipToast from '../components/ShortcutTipToast.vue'
import SettingsSidebar from '../features/settings/components/SettingsSidebar.vue'
import ProfileModal from '../features/profile/components/ProfileModal.vue'
import { useProfilePanel } from '../features/profile/composables/useProfilePanel'
import { useGoalSpace } from '../composables/useGoalSpace'
import { useMainPageState } from '../pages/composables/useMainPageState'
import { useSettingsPanel } from '../features/settings/composables/useSettingsPanel'
import { useHotkeys, useHotkeyOverlay } from '../composables/useHotkeys'
import QuickAddModal from '../features/hotkeys/components/QuickAddModal.vue'
import ShortcutsModal from '../features/hotkeys/components/ShortcutsModal.vue'

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
  handleSaveTimerAsTask,
  handleAttachTimerTask,
  timerTaskOptions,
  dataStats,
  exportData,
  importData,
  restoreSnapshot,
  clearData,
  syncStatus,
  majorTaskOptions,
  handleAddTask,
  handleQuickAdd,
  handleAddSubTask,
  handleCreateGoal,
  handleToggleDone,
  handleTogglePlanned,
  handleSetAsProject,
  handleAttachToProject,
  handleMoveTaskTo,
  handleAssignTaskToGoal,
  handleCreateAllModeMinor,
  handleCreateScheduledTask,
  handleEditTask,
  handleEditNotes,
  handleScheduleTask,
  handleDeleteTask,
  handleDeleteGoal,
  handleChangeGoalRate,
  handleChangeGoalDetails,
  handleChangeGoalStatus,
  handleChangeGoalTheme,
  handleChangeGoalIcon,
  handleSetTaskRate,
} = useMainPageState(goalSpace)

useHotkeys({
  goals: goalSpace.goals,
  activeGoalId: goalSpace.activeGoalId,
  selectView,
  selectGoal,
})

const { overlay } = useHotkeyOverlay()

const { isOpen: isSettingsOpen } = useSettingsPanel()
const { isOpen: isProfileOpen, close: closeProfile } = useProfilePanel()
const { isOpen: isMobileNavOpen, close: closeMobileNav } = useMobileNav()
</script>

<template>
  <div class="app-shell" :class="{ 'is-settings-open': isSettingsOpen }">
    <MobileTopBar
      :active-view="activeView"
      :goal-title="activeGoal?.title ?? null"
      @open-timer="selectView('timer')"
    />

    <aside
      id="app-sidebar"
      class="app-sidebar"
      :class="{ 'is-mobile-open': isMobileNavOpen }"
    >
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
        :sync-status="syncStatus"
        @select-goal="selectGoal"
        @create-goal="handleCreateGoal"
        @select-view="selectView"
        @toggle-notifications="toggleNotifications"
        @delete-goal="handleDeleteGoal"
      />
    </aside>

    <Transition name="mobile-nav-backdrop">
      <div
        v-if="isMobileNavOpen"
        class="mobile-nav-backdrop"
        aria-hidden="true"
        @click="closeMobileNav"
      ></div>
    </Transition>

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
          @edit-notes="handleEditNotes"
          @schedule-task="handleScheduleTask"
          @delete-task="handleDeleteTask"
          @set-task-rate="handleSetTaskRate"
          @assign-goal="handleAssignTaskToGoal"
          @attach-to-project="handleAttachToProject"
          @move-task-to="handleMoveTaskTo"
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

        <AnalyticsView
          v-else-if="activeView === 'analytics'"
          :goals="goals"
          :templates="taskTemplates"
          :daily-tasks="dailyTasks"
          @change-goal-rate="handleChangeGoalRate"
        />

        <TimerView
          v-else-if="activeView === 'timer'"
          :task-options="timerTaskOptions"
          @save-as-task="handleSaveTimerAsTask"
          @attach-task="handleAttachTimerTask"
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
          @edit-notes="handleEditNotes"
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
        @change-goal-rate="handleChangeGoalRate"
        @change-goal-icon="handleChangeGoalIcon"
        @change-goal-details="handleChangeGoalDetails"
        @change-goal-status="handleChangeGoalStatus"
        @delete-goal="handleDeleteGoal"
        @toggle-notifications="toggleNotifications"
        @export-data="exportData"
        @import-data="importData"
        @restore-snapshot="restoreSnapshot"
        @clear-data="clearData"
        @open-starter="openStarter"
      />
    </aside>

    <StarterTemplateModal
      v-if="showStarter"
      @apply="handleApplyStarter"
      @close="closeStarter"
    />

    <ProfileModal v-if="isProfileOpen" @close="closeProfile" />

    <QuickAddModal
      v-if="overlay === 'quick-add'"
      :goals="goals"
      :current-title="activeGoal?.title ?? 'All Projects'"
      @submit="handleQuickAdd"
    />

    <ShortcutsModal v-if="overlay === 'shortcuts'" />

    <UndoToast />

    <ShortcutTipToast />

    <TaskReminderPopup
      v-if="activeAlert"
      :task="activeAlert"
      :pending-count="pendingCount"
      @acknowledge="acknowledgeAlert"
    />
  </div>
</template>
