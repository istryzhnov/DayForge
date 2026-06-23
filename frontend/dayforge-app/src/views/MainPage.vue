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
} = useGoalSpace()

onMounted(() => {
  setGoals([
    {
      id: 'goal-1',
      title: 'Health',
      description: 'Daily routines',
      status: 'active',
      createdAt: '2026-06-19T09:00:00Z',
      updatedAt: '2026-06-19T09:00:00Z',
    },
    {
      description: 'Weekly growth sprint',
      id: 'goal-2',
      title: 'Career',
      status: 'active',
      createdAt: '2026-06-19T09:00:00Z',
      updatedAt: '2026-06-19T09:00:00Z',
    },
  ])
  if (taskTemplates.value.length > 0) return

  const t1 = addTask('goal-1', 'Morning Run', 'major')
  if (t1) {
    addSubTask(t1.id, 'Warm-up', 'minor')
    addSubTask(t1.id, 'Cool-down', 'minor')
  }
  const t2 = addTask('goal-1', 'Healthy Breakfast', 'major')
  if (t2) {
    addSubTask(t2.id, 'Prepare Ingredients', 'minor')
    addSubTask(t2.id, 'Cook', 'minor')
  }

  const t3 = addTask('goal-2', 'Project Delivery', 'major')
  if (t3) {
    addSubTask(t3.id, 'Planning', 'minor')
    addSubTask(t3.id, 'Execution', 'minor')
  }
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
