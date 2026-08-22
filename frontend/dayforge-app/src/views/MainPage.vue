<script setup lang="ts">
import { computed, ref } from 'vue'
import GoalComponent from '../features/goals/components/GoalComponent.vue'
import SidebarComponent from '../features/sidebar/components/SidebarComponent.vue'
import CalendarView from '../features/calendar/components/CalendarView.vue'
import TaskReminderPopup from '../components/TaskReminderPopup.vue'
import PlannedTaskList from '../features/tasks/components/PlannedTaskList.vue'
import ArchiveView from '../features/tasks/components/ArchiveView.vue'
import OnboardingHints from '../features/onboarding/components/OnboardingHints.vue'
import StarterTemplateModal from '../features/onboarding/components/StarterTemplateModal.vue'
import UndoToast from '../components/UndoToast.vue'
import AppearanceSidebar from '../features/appearance/components/AppearanceSidebar.vue'
import { usePlannedTasks } from '../features/tasks/composables/usePlannedTasks'
import { useArchive } from '../features/tasks/composables/useArchive'
import type { StarterPlan } from '../features/onboarding/composables/useStarterTemplate'
import { useGoalSpace } from '../composables/useGoalSpace'
import { useMainPageState } from '../pages/composables/useMainPageState'
import { useTheme } from '../composables/useTheme'
import { buildGoalAccentVars } from '../composables/theme/goalTheme'
import { useAppearancePanel } from '../features/appearance/composables/useAppearancePanel'
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
  applyStarterPlan,
  handleSetAsProject,
  handleAttachToProject,
  handleCreateAllModeMinor,
  handleEditTask,
  handleDeleteTask,
  handleDeleteGoal,
  handleChangeGoalColor,
  handleChangeGoalTheme,
} = useMainPageState(goalSpace)

const { themeMode } = useTheme()
const { isOpen: isAppearanceOpen } = useAppearancePanel()

/**
 * A project's colour has to travel with its tasks outside its own panel — the
 * sidebar row and the calendar blocks belong to shared chrome, so they take the
 * accent-only variant that leaves surrounding surfaces alone.
 */
const goalVarsById = computed(() => {
  const result: Record<ID, Record<string, string>> = {}
  goals.value.forEach((goal) => {
    const vars = buildGoalAccentVars(goal.theme, themeMode.value)
    if (Object.keys(vars).length > 0) result[goal.id] = vars
  })
  return result
})

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

type ActiveView = 'goals' | 'calendar' | 'planned' | 'archive'
const activeView = ref<ActiveView>('goals')

const { plannedTasks, plannedCount } = usePlannedTasks({
  getTemplates: () => taskTemplates.value,
  getDailyTasks: () => dailyTasks.value,
  getGoals: () => goals.value,
})

const { blocks: archiveBlocks, totalDone } = useArchive({
  getTemplates: () => taskTemplates.value,
  getDailyTasks: () => dailyTasks.value,
  getGoals: () => goals.value,
})

// A brand new install: nothing to look at, so explain the model instead.
const isFirstRun = computed(
  () => goals.value.length === 0 && taskTemplates.value.length === 0,
)
const showStarter = ref(false)

function handleApplyStarter(plan: StarterPlan) {
  applyStarterPlan(plan)
  showStarter.value = false
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
  <div class="app-shell" :class="{ 'is-appearance-open': isAppearanceOpen }">
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
        @select-goal="handleSelectGoal"
        @create-goal="handleCreateGoal"
        @select-view="handleSelectView"
        @toggle-notifications="handleToggleNotifications"
        @delete-goal="handleDeleteGoal"
      />
    </aside>

    <main class="app-content">
      <div class="app-content__inner">
        <OnboardingHints
          v-if="isFirstRun && activeView === 'goals'"
          @open-starter="showStarter = true"
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
          @prev-day="goToPreviousDay"
          @next-day="goToNextDay"
          @today="goToToday"
          :project-options="majorTaskOptions"
          :daily-tasks="dailyTasks"
          :templates="taskTemplates"
          :goal-vars-by-id="goalVarsById"
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

    <!-- Sits to the right of everything: its own column on a wide screen, an
         overlay drawer once the shell runs out of room. -->
    <aside v-if="isAppearanceOpen" class="app-appearance">
      <AppearanceSidebar
        :active-goal="activeGoal"
        @change-goal-theme="handleChangeGoalTheme"
      />
    </aside>

    <StarterTemplateModal
      v-if="showStarter"
      @apply="handleApplyStarter"
      @close="showStarter = false"
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
