<script setup lang="ts">
import { onMounted } from 'vue'
import GoalComponent from '../components/GoalComponent.vue'
import SidebarComponent from '../components/SidebarComponent.vue'
import { useGoalSpace } from '../composable/useGoalSpace.ts'
import type { ID, Priority } from '../entities/types.ts'

const {
  goals,
  activeGoal,
  selectGoal,
  setGoals,
  taskTemplates,
  tasksForActiveGoal,
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
  if (!activeGoal.value) return
  addSubTask(parentTemplateId, title, priority)
}
</script>

<template>
  <div class="layout">
    <aside>
      <SidebarComponent
        :goals="goals"
        :active-goal-id="activeGoal?.id ?? null"
        @select-goal="selectGoal"
      />
    </aside>

    <div>
      <GoalComponent
        :goal="activeGoal"
        :tasks="tasksForActiveGoal"
        @add-task="handleAddTask"
        @add-subtask="handleAddSubTask"
      />
    </div>
  </div>
</template>
