<script setup lang="ts">
import { computed, ref } from 'vue'
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
import TaskMoveDialog from '../../tasks/components/TaskMoveDialog.vue'
import type { TaskDropPayload } from '../../tasks/composables/useTaskDrag'
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
  (e: 'schedule-task', templateId: ID, schedule: TaskSchedule | null): void
  (e: 'delete-task', templateId: ID): void
  (e: 'set-task-rate', templateId: ID, hourlyRate: number | undefined): void
  (e: 'assign-goal', templateId: ID, goalId: ID | undefined): void
  (e: 'attach-to-project', templateId: ID, projectTemplateId: ID | null): void
  (e: 'move-task-to', payload: TaskDropPayload): void
}>()

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
      @quick-add="(title, schedule) => submitQuickAdd(title, schedule)"
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

    <HabitCalendar
      :title="habitTitle"
      :subtitle="habitSubtitle"
      :today-percent="todayProgress.percent"
      :cells="monthCells"
    />
  </section>
</template>
