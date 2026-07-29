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
} = useGoalPanelState(props, {
  onAddTask: (title, priority) => emit('add-task', title, priority),
  onAddSubtask: (parentTemplateId, title, priority) =>
    emit('add-subtask', parentTemplateId, title, priority),
  onToggleMinor: (dailyTaskId) => emit('toggle-minor', dailyTaskId),
  onResolveMajor: (dailyMajorTaskId, decision) =>
    emit('resolve-major', dailyMajorTaskId, decision),
  onCreateAllModeMinor: (title, goalId, majorId) =>
    emit('create-all-mode-minor', title, goalId, majorId),
})

const selectedMajorDailyTaskId = ref<ID | null>(null)
const progressScope = computed<ProgressScope>(() => {
  if (selectedMajorDailyTaskId.value) {
    return { type: 'major', majorDailyTaskId: selectedMajorDailyTaskId.value }
  }

  if (!props.isAllMode && props.goal) {
    return { type: 'goal', goalId: props.goal.id }
  }

  return { type: 'all' }
})
const dailyTasksRef = computed(() => props.dailyTasks)
const currentDateRef = computed(() => props.currentDate)

const { todayProgress, monthCells } = useProgressMetrics(
  dailyTasksRef as any,
  currentDateRef as any,
  progressScope as any,
)
</script>

<template>
  <section class="goal-panel">
    <GoalPanelHeader
      :title="panelTitle"
      :description="panelDescription"
      :status="isAllMode ? 'overview' : (goal?.status ?? 'active')"
      :total-count="totalCount"
      :major-count="majorCount"
      :sub-count="subCount"
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
    />

    <HabitCalendar
      :title="
        progressScope.type === 'major'
          ? 'Major habit'
          : progressScope.type === 'goal'
            ? 'Goal habit'
            : 'All goals habit'
      "
      :subtitle="
        progressScope.type === 'major'
          ? 'Progress for selected major'
          : progressScope.type === 'goal'
            ? 'Progress for selected goal'
            : 'Progress across all goals'
      "
      :today-percent="todayProgress.percent"
      :cells="monthCells"
    />
  </section>
</template>
