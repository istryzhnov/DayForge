<script setup lang="ts">
import { computed, onMounted } from 'vue'
import GoalComponent from '../components/GoalComponent.vue'
import SidebarComponent from '../components/SidebarComponent.vue'
import { useGoalSpace } from '../composable/useGoalSpace.ts'
import type { ID, Priority } from '../entities/types.ts'
import type { MajorDecision } from '../entities/TaskEntity.ts'

const {
  goals,
  activeGoalId,
  activeGoal,
  selectGoal,
  taskTemplates,
  tasksForActiveGoal,
  taskCountByGoal,
  addTask,
  addSubTask,
  addMajorWithMinor,
  activeMajorTemplates,
  toggleMinorDone,
  resolveMajorTask,
  createGoal,
  initializeStorage,
} = useGoalSpace()

const majorTaskOptions = computed(() =>
  activeMajorTemplates.value.map((template) => ({
    id: template.id,
    title: template.title,
    goalTitle:
      goals.value.find((goal) => goal.id === template.goalId)?.title ??
      'Unknown Goal',
  })),
)

onMounted(() => {
  initializeStorage()
})

function handleAddTask(title: string, priority: Priority) {
  if (!activeGoal.value) return
  addTask(activeGoal.value.id, title, priority)
}

function handleAddSubTask(
  parentTemplateId: ID,
  title: string,
  priority: Priority,
) {
  addSubTask(parentTemplateId, title, priority)
}

function handleCreateGoal(title: string, description: string) {
  const now = new Date().toISOString()
  const newGoal = {
    id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    description,
    status: 'active' as const,
    createdAt: now,
    updatedAt: now,
  }
  createGoal(newGoal)
}

function handleToggleMinor(dailyTaskId: ID) {
  toggleMinorDone(dailyTaskId)
}

function handleResolveMajor(dailyMajorTaskId: ID, decision: MajorDecision) {
  resolveMajorTask(dailyMajorTaskId, decision)
}

function handleAttachMinorTask(majorTemplateId: ID, title: string) {
  addSubTask(majorTemplateId, title, 'minor')
}

function handleCreateMajorWithMinor(
  goalId: ID,
  majorTitle: string,
  minorTitle: string,
) {
  addMajorWithMinor(goalId, majorTitle, minorTitle)
}
</script>

<template>
  <div class="app-shell">
    <aside class="app-sidebar">
      <SidebarComponent
        :goals="goals"
        :active-goal-id="activeGoalId"
        :task-count-by-goal="taskCountByGoal"
        :total-task-count="taskTemplates.length"
        @select-goal="selectGoal"
        @create-goal="handleCreateGoal"
      />
    </aside>

    <main class="app-content">
      <GoalComponent
        :goal="activeGoal"
        :goals="goals"
        :tasks="tasksForActiveGoal"
        :is-all-mode="activeGoalId === null"
        :major-task-options="majorTaskOptions"
        @add-task="handleAddTask"
        @add-subtask="handleAddSubTask"
        @toggle-minor="handleToggleMinor"
        @resolve-major="handleResolveMajor"
        @attach-minor-task="handleAttachMinorTask"
        @create-major-with-minor="handleCreateMajorWithMinor"
      />
    </main>
  </div>
</template>
