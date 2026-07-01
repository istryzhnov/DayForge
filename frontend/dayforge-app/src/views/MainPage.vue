<script setup lang="ts">
import { onMounted } from 'vue'
import GoalComponent from '../components/GoalComponent.vue'
import SidebarComponent from '../components/SidebarComponent.vue'
import { useGoalSpace } from '../composable/useGoalSpace.ts'
import type { ID, Priority } from '../entities/types.ts'

const {
  goals,
  activeGoalId,
  activeGoal,
  selectGoal,
  setGoals,
  taskTemplates,
  tasksForActiveGoal,
  taskCountByGoal,
  addTask,
  addSubTask,
  createGoal,
  initializeStorage,
} = useGoalSpace()

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
        @add-task="handleAddTask"
        @add-subtask="handleAddSubTask"
      />
    </main>
  </div>
</template>
