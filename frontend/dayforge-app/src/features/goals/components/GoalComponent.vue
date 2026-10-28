<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type {
  DailyTask,
  MajorTaskOption,
  TaskSchedule,
  TaskTemplate,
} from '../../../entities/TaskEntity'
import type { ID, ISODate, Priority } from '../../../entities/types'
import { GOAL_STATUS, type BoardStage } from '../../../entities/constants'
import GoalPanelHeader from './GoalPanelHeader.vue'
import GoalComposerZone from './GoalComposerZone.vue'
import GoalTasksZone from './GoalTasksZone.vue'
import HabitCalendar from './HabitCalendar.vue'
import TaskMoveDialog from '../../tasks/components/TaskMoveDialog.vue'
import UpcomingTasks from '../../tasks/components/UpcomingTasks.vue'
import type { TaskDropPayload } from '../../tasks/composables/useTaskDrag'
import { useGoalPanelState } from '../composables/useGoalPanelState'
import { useSettingsPanel } from '../../settings/composables/useSettingsPanel'
import { useProjectBudgetStatus } from '../../analytics/composables/useProjectBudgetStatus'
import { projectColors } from '../../../composables/theme/goalTheme'

// Opened on demand (board toggle, notes button), so kept out of the first chunk.
const ProjectBoard = defineAsyncComponent(
  () => import('../../board/components/ProjectBoard.vue'),
)
const ProjectNotesPanel = defineAsyncComponent(
  () => import('./ProjectNotesPanel.vue'),
)

const props = defineProps<{
  goal: Goal | null
  goals: Goal[]
  tasks: DailyTask[]
  /** Source of creation order — drives newest-first sorting. */
  templates: TaskTemplate[]
  /** Template just created, so its row can play the "added" highlight. */
  newTemplateId: ID | null
  isAllMode: boolean
  majorTaskOptions: MajorTaskOption[]
  dailyTasks: DailyTask[]
  currentDate: ISODate
}>()

const emit = defineEmits<{
  (
    e: 'add-task',
    title: string,
    priority: Priority,
    schedule?: TaskSchedule,
  ): void
  (
    e: 'add-subtask',
    parentTemplateId: ID,
    title: string,
    priority: Priority,
    schedule?: TaskSchedule,
  ): void
  (e: 'toggle-done', dailyTaskId: ID): void
  (e: 'set-as-project', templateId: ID): void
  (
    e: 'create-all-mode-minor',
    title: string,
    goalId?: ID,
    majorId?: ID,
    schedule?: TaskSchedule,
  ): void
  (e: 'edit-task', templateId: ID, title: string): void
  (e: 'edit-notes', templateId: ID, notes: string): void
  (e: 'schedule-task', templateId: ID, schedule: TaskSchedule | null): void
  (e: 'delete-task', templateId: ID): void
  (e: 'set-task-rate', templateId: ID, hourlyRate: number | undefined): void
  (e: 'assign-goal', templateId: ID, goalId: ID | undefined): void
  (e: 'attach-to-project', templateId: ID, projectTemplateId: ID | null): void
  (e: 'move-task-to', payload: TaskDropPayload): void
  (e: 'nudge-task', templateId: ID, step: -1 | 1): void
  (e: 'set-board-stage', templateId: ID, stage: BoardStage | undefined): void
  (e: 'clear-board-done', templateIds: ID[]): void
  (e: 'toggle-planned', templateId: ID, date: ISODate): void
  (e: 'change-goal-board', goalId: ID, enabled: boolean): void
  (e: 'change-goal-notes', goalId: ID, notes: string): void
  (e: 'select-date', date: ISODate): void
  (e: 'today'): void
}>()

// The board is opt-in per project: until it is switched on, nothing here
// changes and the list is the only view.
const showBoard = computed(
  () => !props.isAllMode && props.goal?.boardEnabled === true,
)

/** The board shows this project's tasks only, whatever day the list shows. */
const boardTemplates = computed(() =>
  props.templates.filter((template) => template.goalId === props.goal?.id),
)

/** The header chip: how far this project is through its budget, if it has one. */
const budgetStatus = useProjectBudgetStatus(
  () => (props.isAllMode ? null : props.goal),
  () => props.goals,
  () => props.templates,
)

const notesOpen = ref(false)
const { isOpen: isSettingsOpen, close: closeSettings } = useSettingsPanel()

// Notes and the settings column share the right side, so one closes the other.
function toggleNotes() {
  notesOpen.value = !notesOpen.value
  if (notesOpen.value) closeSettings()
}

watch(isSettingsOpen, (open) => {
  if (open) notesOpen.value = false
})

const movingTemplateId = ref<ID | null>(null)

const movingTemplate = computed(
  () =>
    props.templates.find(
      (template) => template.id === movingTemplateId.value,
    ) ?? null,
)

function openMoveDialog(templateId: ID) {
  movingTemplateId.value = templateId
}

function closeMoveDialog() {
  movingTemplateId.value = null
}

const {
  taskGroups,
  panelTitle,
  panelStats,
  viewedDayLabel,
  upcomingDays,
  hasHabits,
  habitWindow,
  habitStreakByTemplate,
  goalPanelStyle,
  focusProject,
  submitTask,
  submitMinor,
  submitSubtask,
  toggleDone,
  editTask,
  editNotes,
  deleteTask,
  setAsProject,
} = useGoalPanelState(props, {
  onAddTask: (title, priority, schedule) =>
    emit('add-task', title, priority, schedule),
  onAddSubtask: (parentTemplateId, title, priority, schedule) =>
    emit('add-subtask', parentTemplateId, title, priority, schedule),
  onToggleDone: (dailyTaskId) => emit('toggle-done', dailyTaskId),
  onCreateAllModeMinor: (title, goalId, majorId, schedule) =>
    emit('create-all-mode-minor', title, goalId, majorId, schedule),
  onEditTask: (templateId, title) => emit('edit-task', templateId, title),
  onEditNotes: (templateId, notes) => emit('edit-notes', templateId, notes),
  onDeleteTask: (templateId) => emit('delete-task', templateId),
  onSetAsProject: (templateId) => emit('set-as-project', templateId),
})

// Upcoming is for a project or All Projects; with no goal selected it stays hidden.
const showUpcoming = computed(
  () => (props.isAllMode || !!props.goal) && upcomingDays.value.length > 0,
)

/** Colour of the project's dot in the header; All Projects has none. */
const projectColor = computed(() =>
  props.isAllMode || !props.goal
    ? undefined
    : projectColors(props.goals).get(props.goal.id),
)
</script>

<template>
  <section class="goal-panel" :style="goalPanelStyle">
    <GoalPanelHeader
      :title="panelTitle"
      :color="projectColor"
      :status="isAllMode ? 'overview' : (goal?.status ?? GOAL_STATUS.ACTIVE)"
      :stats="panelStats"
      :viewed-day="viewedDayLabel"
      :show-settings="!isAllMode && !!goal"
      :show-toolbar="!isAllMode && !!goal"
      :board-enabled="showBoard"
      :has-notes="!!goal?.notes"
      :notes-open="notesOpen"
      :budget="budgetStatus"
      @set-board="
        (enabled) => goal && emit('change-goal-board', goal.id, enabled)
      "
      @toggle-notes="toggleNotes"
      @today="emit('today')"
    />

    <GoalComposerZone
      :is-all-mode="isAllMode"
      :goals="goals"
      :major-task-options="majorTaskOptions"
      @add-task="
        (title, priority, schedule) => submitTask(title, priority, schedule)
      "
      @create-all-mode-minor="
        (title, goalId, majorId, schedule) =>
          submitMinor(title, goalId, majorId, schedule)
      "
    />

    <ProjectBoard
      v-if="showBoard"
      :rows="dailyTasks"
      :templates="boardTemplates"
      @toggle-done="(dailyTaskId) => emit('toggle-done', dailyTaskId)"
      @toggle-planned="
        (templateId, date) => emit('toggle-planned', templateId, date)
      "
      @clear-done="(templateIds) => emit('clear-board-done', templateIds)"
      @set-board-stage="
        (templateId, stage) => emit('set-board-stage', templateId, stage)
      "
      @add-task="(title, priority) => emit('add-task', title, priority)"
      @edit-task="(templateId, title) => emit('edit-task', templateId, title)"
      @edit-notes="(templateId, notes) => editNotes(templateId, notes)"
      @delete-task="(templateId) => deleteTask(templateId)"
      @schedule-task="
        (templateId, schedule) => emit('schedule-task', templateId, schedule)
      "
    />

    <GoalTasksZone
      v-else
      :groups="taskGroups"
      :is-all-mode="isAllMode"
      @add-subtask="
        (parentId, title, priority, schedule) =>
          submitSubtask(parentId, title, priority, schedule)
      "
      @toggle-done="(dailyTaskId) => toggleDone(dailyTaskId)"
      @focus-project="focusProject"
      @edit-task="(templateId, title) => editTask(templateId, title)"
      @edit-notes="(templateId, notes) => editNotes(templateId, notes)"
      @schedule-task="
        (templateId, schedule) => emit('schedule-task', templateId, schedule)
      "
      @set-task-rate="
        (templateId, hourlyRate) =>
          emit('set-task-rate', templateId, hourlyRate)
      "
      @delete-task="(templateId) => deleteTask(templateId)"
      @set-as-project="(templateId) => setAsProject(templateId)"
      @move-task="openMoveDialog"
      @move-task-to="(payload) => emit('move-task-to', payload)"
      @nudge-task="(templateId, step) => emit('nudge-task', templateId, step)"
    />

    <TaskMoveDialog
      v-if="movingTemplate"
      :template="movingTemplate"
      :goals="goals"
      :project-options="majorTaskOptions"
      @assign-goal="
        (templateId, goalId) => emit('assign-goal', templateId, goalId)
      "
      @attach-to-project="
        (templateId, projectId) =>
          emit('attach-to-project', templateId, projectId)
      "
      @close="closeMoveDialog"
    />

    <!-- Upcoming and Habits share a row; each one drops out when it has nothing. -->
    <div v-if="showUpcoming || hasHabits" class="goal-side-row">
      <UpcomingTasks
        v-if="showUpcoming"
        :days="upcomingDays"
        :goals="goals"
        @select-date="(date) => emit('select-date', date)"
      />
      <HabitCalendar
        v-if="hasHabits"
        :view="habitWindow"
        :streaks="habitStreakByTemplate"
      />
    </div>

    <ProjectNotesPanel
      v-if="notesOpen && goal && !isAllMode"
      :key="goal.id"
      :goal-id="goal.id"
      :title="goal.title"
      :notes="goal.notes ?? ''"
      :theme-style="goalPanelStyle"
      @save="(goalId, notes) => emit('change-goal-notes', goalId, notes)"
      @close="notesOpen = false"
    />
  </section>
</template>
