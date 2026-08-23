<script setup lang="ts">
import type { Goal } from '../../../entities/GoalEntity'
import type {
  DailyTask,
  MajorTaskOption,
  TaskSchedule,
  TaskTemplate,
} from '../../../entities/TaskEntity'
import type { ID, ISODate, Priority } from '../../../entities/types'
import { GOAL_STATUS } from '../../../entities/constants'
import GoalPanelHeader from './GoalPanelHeader.vue'
import GoalComposerZone from './GoalComposerZone.vue'
import GoalTasksZone from './GoalTasksZone.vue'
import HabitCalendar from './HabitCalendar.vue'
import { useGoalPanelState } from '../composables/useGoalPanelState'

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
  todayProgress,
  monthCells,
  habitTitle,
  habitSubtitle,
  goalPanelStyle,
  focusProject,
  submitTask,
  submitMinor,
  submitSubtask,
  submitQuickAdd,
  toggleDone,
  editTask,
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
  onDeleteTask: (templateId) => emit('delete-task', templateId),
  onSetAsProject: (templateId) => emit('set-as-project', templateId),
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
      @add-task="
        (title, priority, schedule) => submitTask(title, priority, schedule)
      "
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
      @focus-project="focusProject"
      @edit-task="(templateId, title) => editTask(templateId, title)"
      @delete-task="(templateId) => deleteTask(templateId)"
      @set-as-project="(templateId) => setAsProject(templateId)"
      @quick-add="(title, schedule) => submitQuickAdd(title, schedule)"
    />

    <HabitCalendar
      :title="habitTitle"
      :subtitle="habitSubtitle"
      :today-percent="todayProgress.percent"
      :cells="monthCells"
    />
  </section>
</template>
