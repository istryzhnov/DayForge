<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type {
  DailyTask,
  MajorTaskOption,
  TaskTemplate,
} from '../../../entities/TaskEntity'
import type { ID, ISODate } from '../../../entities/types'
import { GOAL_STATUS } from '../../../entities/constants'
import GoalPanelHeader from './GoalPanelHeader.vue'
import GoalComposerZone from './GoalComposerZone.vue'
import TodaySummary from './TodaySummary.vue'
import TodayProjectChips from './TodayProjectChips.vue'
import HabitCalendar from './HabitCalendar.vue'
import { TaskList, TaskMoveDialog, UpcomingTasks } from '../../tasks'
import { useGoalPanelState } from '../composables/useGoalPanelState'
import { useSettingsPanel } from '../../../shared/composables/useSettingsPanel'
import { useModules } from '../../../shared/composables/useModules'
import { useProjectBudgetStatus } from '../../../shared/composables/billing/useProjectBudgetStatus'
import { projectColors } from '../../../shared/composables/theme/goalTheme'
import { referencedParentIds } from '../../../shared/composables/goalSpace/taskParents'
import { filterGroupsByProject, flattenNodes } from '../composables/todayView'
import type { TaskGroup } from '../../../shared/composables/useTaskTree'

// Opened on demand (board toggle, notes button), so kept out of the first chunk.
const ProjectBoard = defineAsyncComponent(() =>
  import('../../board').then((board) => board.ProjectBoard),
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
  (e: 'change-goal-board', goalId: ID, enabled: boolean): void
  (e: 'change-goal-notes', goalId: ID, notes: string): void
  (e: 'select-date', date: ISODate): void
  (e: 'today'): void
}>()

// The board is opt-in per project: until it is switched on, nothing here
// changes and the list is the only view.
const { isOn: isModuleOn } = useModules()
/** Habit calendar and streaks belong to the Habits module. */
const showHabits = computed(() => hasHabits.value && isModuleOn('habits'))
const showBoard = computed(
  () =>
    !props.isAllMode &&
    props.goal?.boardEnabled === true &&
    isModuleOn('board'),
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

/** Templates some other template is filed under: the parents. */
const parentTemplateIds = computed(() =>
  referencedParentIds(props.templates, (template) => template.parentTemplateId),
)

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
  trackedTodayMs,
  viewedDayLabel,
  upcomingDays,
  hasHabits,
  habitWindow,
  habitStreakByTemplate,
  goalPanelStyle,
  focusProject,
} = useGoalPanelState(props)

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

// --- the All view's day summary and project filter (local UI state only) ---

const allProjectColors = computed(() => projectColors(props.goals))

/** The project picked in the chips row; null shows every project. */
const pickedProjectId = ref<ID | null>(null)

const allModeRowCount = computed(() => flattenNodes(taskGroups.value).length)

/** One chip per active project; none outside All view. */
const todayProjects = computed(() =>
  props.isAllMode
    ? props.goals.filter((goal) => goal.status === GOAL_STATUS.ACTIVE)
    : [],
)

/** A pick is dropped as soon as its project has no rows left today. */
const activeProjectId = computed<ID | null>(() =>
  todayProjects.value.some((project) => project.id === pickedProjectId.value)
    ? pickedProjectId.value
    : null,
)

/** The rows the list draws: all of them, or just the picked project's. */
const listGroups = computed<TaskGroup[]>(() =>
  activeProjectId.value
    ? filterGroupsByProject(taskGroups.value, activeProjectId.value)
    : taskGroups.value,
)
</script>

<template>
  <section
    class="goal-panel"
    :class="{
      'has-side': !showBoard && (showUpcoming || showHabits),
      'is-all-mode': isAllMode,
    }"
    :style="goalPanelStyle"
  >
    <GoalPanelHeader
      :title="panelTitle"
      :color="projectColor"
      :icon="goal?.icon"
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

    <template v-if="isAllMode">
      <TodaySummary
        :tracked-ms="trackedTodayMs"
        :earned="panelStats.earnedToday"
        :done="panelStats.todayDone"
        :total="panelStats.todayTotal"
      />
      <TodayProjectChips
        v-if="todayProjects.length"
        :projects="todayProjects"
        :colors="allProjectColors"
        :total="allModeRowCount"
        :selected-id="activeProjectId"
        @select="(goalId) => (pickedProjectId = goalId)"
      />
    </template>

    <GoalComposerZone
      :is-all-mode="isAllMode"
      :goals="goals"
      :major-task-options="majorTaskOptions"
    />

    <!-- The board, the list and the move dialog change tasks through
         useTaskActions(), so none of those changes passes through here. -->
    <ProjectBoard
      v-if="showBoard"
      :rows="dailyTasks"
      :templates="boardTemplates"
      :custom-columns="goal?.boardColumns ?? []"
      :project-rate="goal?.hourlyRate"
      @move-task="openMoveDialog"
    />

    <TaskList
      v-else
      :groups="listGroups"
      :is-all-mode="isAllMode"
      @focus-project="focusProject"
      @move-task="openMoveDialog"
    />

    <TaskMoveDialog
      v-if="movingTemplate"
      :template="movingTemplate"
      :has-children="parentTemplateIds.has(movingTemplate.id)"
      :goals="goals"
      :project-options="majorTaskOptions"
      @close="closeMoveDialog"
    />

    <!-- Upcoming and Habits share a row; each one drops out when it has nothing. -->
    <div v-if="showUpcoming || showHabits" class="goal-side-row">
      <UpcomingTasks
        v-if="showUpcoming"
        :days="upcomingDays"
        :goals="goals"
        @select-date="(date) => emit('select-date', date)"
      />
      <HabitCalendar
        v-if="showHabits"
        :view="habitWindow"
        :streaks="habitStreakByTemplate"
      />
    </div>

    <ProjectNotesPanel
      v-if="notesOpen && goal && !isAllMode && isModuleOn('notes')"
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
