<script setup lang="ts">
import type { Goal } from '../../../entities/GoalEntity'
import type {
  DailyTask,
  MajorDecision,
  MajorTaskOption,
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

const props = defineProps<{
  goal: Goal | null
  goals: Goal[]
  tasks: DailyTask[]
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
  ): void
  (e: 'toggle-minor', dailyTaskId: ID): void
  (e: 'resolve-major', dailyMajorTaskId: ID, decision: MajorDecision): void
  (e: 'create-all-mode-minor', title: string, goalId?: ID, majorId?: ID): void
  (e: 'edit-task', templateId: ID, title: string): void
  (e: 'delete-task', templateId: ID): void
  (e: 'delete-goal', goalId: ID): void
  (e: 'change-goal-color', goalId: ID, color: string | undefined): void
}>()

const {
  orderedFlatNodes,
  totalCount,
  majorCount,
  subCount,
  panelTitle,
  panelDescription,
  submitTask,
  submitMinor,
  submitSubtask,
  toggleMinor,
  resolveMajor,
  editTask,
  deleteTask,
} = useGoalPanelState(props, {
  onAddTask: (title, priority) => emit('add-task', title, priority),
  onAddSubtask: (parentTemplateId, title, priority) =>
    emit('add-subtask', parentTemplateId, title, priority),
  onToggleMinor: (dailyTaskId) => emit('toggle-minor', dailyTaskId),
  onResolveMajor: (dailyMajorTaskId, decision) =>
    emit('resolve-major', dailyMajorTaskId, decision),
  onCreateAllModeMinor: (title, goalId, majorId) =>
    emit('create-all-mode-minor', title, goalId, majorId),
  onEditTask: (templateId, title) => emit('edit-task', templateId, title),
  onDeleteTask: (templateId) => emit('delete-task', templateId),
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

const goalPanelStyle = computed(() =>
  !props.isAllMode && props.goal?.accentColor
    ? { '--accent': props.goal.accentColor }
    : undefined,
)
</script>

<template>
  <section class="goal-panel" :style="goalPanelStyle">
    <GoalPanelHeader
      :title="panelTitle"
      :description="panelDescription"
      :status="isAllMode ? 'overview' : (goal?.status ?? GOAL_STATUS.ACTIVE)"
      :total-count="totalCount"
      :major-count="majorCount"
      :sub-count="subCount"
      :show-settings="!isAllMode && !!goal"
      :accent-color="goal?.accentColor"
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
        (title, goalId, majorId) => submitMinor(title, goalId, majorId)
      "
    />

    <GoalTasksZone
      :nodes="orderedFlatNodes"
      :is-all-mode="isAllMode"
      @add-subtask="
        (parentId, title, priority) => submitSubtask(parentId, title, priority)
      "
      @toggle-minor="(dailyTaskId) => toggleMinor(dailyTaskId)"
      @resolve-major="
        (dailyMajorTaskId, decision) => resolveMajor(dailyMajorTaskId, decision)
      "
      @focus-major="(majorId) => (selectedMajorDailyTaskId = majorId)"
      @edit-task="(templateId, title) => editTask(templateId, title)"
      @delete-task="(templateId) => deleteTask(templateId)"
    />

    <HabitCalendar
      :title="
        progressScope.type === PROGRESS_SCOPE_TYPE.MAJOR
          ? 'Major habit'
          : progressScope.type === PROGRESS_SCOPE_TYPE.GOAL
            ? 'Goal habit'
            : 'All goals habit'
      "
      :subtitle="
        progressScope.type === PROGRESS_SCOPE_TYPE.MAJOR
          ? 'Progress for selected major'
          : progressScope.type === PROGRESS_SCOPE_TYPE.GOAL
            ? 'Progress for selected goal'
            : 'Progress across all goals'
      "
      :today-percent="todayProgress.percent"
      :cells="monthCells"
    />
  </section>
</template>
