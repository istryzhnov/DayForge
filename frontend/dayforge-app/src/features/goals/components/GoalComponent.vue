<script setup lang="ts">
import type { Goal } from '../../../entities/GoalEntity'
import type {
  DailyTask,
  MajorTaskOption,
  TaskSchedule,
  TaskTemplate,
} from '../../../entities/TaskEntity'
import type { ID, Priority } from '../../../entities/types'
import GoalPanelHeader from './GoalPanelHeader.vue'
import GoalComposerZone from './GoalComposerZone.vue'
import GoalTasksZone from './GoalTasksZone.vue'
import { useGoalPanelState } from '../composables/useGoalPanelState'
import { computed, ref } from 'vue'
import type { ProgressScope } from '../../../composables/useProgressMetrics'
import { useProgressMetrics } from '../../../composables/useProgressMetrics'
import HabitCalendar from './HabitCalendar.vue'
import type { ISODate } from '../../../entities/types'
import { GOAL_STATUS, PROGRESS_SCOPE_TYPE } from '../../../entities/constants'
import { useTheme } from '../../../composables/useTheme'
import { buildGoalThemeVars } from '../../../composables/theme/goalTheme'

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
  (e: 'add-task', title: string, priority: Priority): void
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
  (e: 'delete-task', templateId: ID): void
  (e: 'delete-goal', goalId: ID): void
  (e: 'change-goal-color', goalId: ID, color: string | undefined): void
}>()

const {
  taskGroups,
  totalCount,
  projectCount,
  taskCount,
  panelTitle,
  panelDescription,
  submitTask,
  submitMinor,
  submitSubtask,
  submitQuickAdd,
  toggleDone,
  editTask,
  deleteTask,
  setAsProject,
} = useGoalPanelState(props, {
  onAddTask: (title, priority) => emit('add-task', title, priority),
  onAddSubtask: (parentTemplateId, title, priority, schedule) =>
    emit('add-subtask', parentTemplateId, title, priority, schedule),
  onToggleDone: (dailyTaskId) => emit('toggle-done', dailyTaskId),
  onCreateAllModeMinor: (title, goalId, majorId, schedule) =>
    emit('create-all-mode-minor', title, goalId, majorId, schedule),
  onEditTask: (templateId, title) => emit('edit-task', templateId, title),
  onDeleteTask: (templateId) => emit('delete-task', templateId),
  onSetAsProject: (templateId) => emit('set-as-project', templateId),
})

const selectedMajorDailyTaskId = ref<ID | null>(null)
const progressScope = computed<ProgressScope>(() => {
  if (selectedMajorDailyTaskId.value) {
    return {
      type: PROGRESS_SCOPE_TYPE.MAJOR,
      majorDailyTaskId: selectedMajorDailyTaskId.value,
    }
  }

  if (!props.isAllMode && props.goal) {
    return { type: PROGRESS_SCOPE_TYPE.GOAL, goalId: props.goal.id }
  }

  return { type: PROGRESS_SCOPE_TYPE.ALL }
})
const dailyTasksRef = computed(() => props.dailyTasks)
const currentDateRef = computed(() => props.currentDate)

const { todayProgress, monthCells } = useProgressMetrics(
  dailyTasksRef as any,
  currentDateRef as any,
  progressScope as any,
)

const { themeMode, surfaces } = useTheme()

/**
 * A project's colour has to reach further than `--accent`: the task circles,
 * the frames and the habit ring all read their own tokens, so the whole set is
 * derived from the project colour and carried by the panel.
 */
const goalPanelStyle = computed(() => {
  if (props.isAllMode || !props.goal?.theme) return undefined
  const vars = buildGoalThemeVars(
    props.goal.theme,
    surfaces.value,
    themeMode.value,
  )
  return Object.keys(vars).length > 0 ? vars : undefined
})
</script>

<template>
  <section class="goal-panel" :style="goalPanelStyle">
    <GoalPanelHeader
      :title="panelTitle"
      :description="panelDescription"
      :status="isAllMode ? 'overview' : (goal?.status ?? GOAL_STATUS.ACTIVE)"
      :total-count="totalCount"
      :project-count="projectCount"
      :task-count="taskCount"
      :show-settings="!isAllMode && !!goal"
      :goal-theme="goal?.theme"
      @delete-goal="goal && emit('delete-goal', goal.id)"
      @change-color="
        (color) => goal && emit('change-goal-color', goal.id, color)
      "
    />

    <GoalComposerZone
      :is-all-mode="isAllMode"
      :goals="goals"
      :major-task-options="majorTaskOptions"
      @add-task="(title, priority) => submitTask(title, priority)"
      @create-all-mode-minor="
        (title, goalId, majorId, schedule) =>
          submitMinor(title, goalId, majorId, schedule)
      "
    />

    <GoalTasksZone
      :groups="taskGroups"
      :is-all-mode="isAllMode"
      @add-subtask="
        (parentId, title, priority, schedule) =>
          submitSubtask(parentId, title, priority, schedule)
      "
      @toggle-done="(dailyTaskId) => toggleDone(dailyTaskId)"
      @focus-project="(taskId) => (selectedMajorDailyTaskId = taskId)"
      @edit-task="(templateId, title) => editTask(templateId, title)"
      @delete-task="(templateId) => deleteTask(templateId)"
      @set-as-project="(templateId) => setAsProject(templateId)"
      @quick-add="(title) => submitQuickAdd(title)"
    />

    <HabitCalendar
      :title="
        progressScope.type === PROGRESS_SCOPE_TYPE.MAJOR
          ? 'Project habit'
          : progressScope.type === PROGRESS_SCOPE_TYPE.GOAL
            ? 'Goal habit'
            : 'All goals habit'
      "
      :subtitle="
        progressScope.type === PROGRESS_SCOPE_TYPE.MAJOR
          ? 'Progress for selected project'
          : progressScope.type === PROGRESS_SCOPE_TYPE.GOAL
            ? 'Progress for selected goal'
            : 'Progress across all goals'
      "
      :today-percent="todayProgress.percent"
      :cells="monthCells"
    />
  </section>
</template>
