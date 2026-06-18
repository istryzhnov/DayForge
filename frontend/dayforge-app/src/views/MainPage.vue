<script setup lang="ts">
import { onMounted } from 'vue'
import GoalComponent from '../components/GoalComponent.vue'
import SidebarComponent from '../components/SidebarComponent.vue'
import { useGoals } from '../composable/useGoals'

const { goals, activeGoal, selectGoal, setGoals } = useGoals()

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
})
</script>

<template>
  <aside>
    <SidebarComponent
      :goals="goals"
      :active-goal-id="activeGoal?.id ?? null"
      @select-goal="selectGoal"
    />
  </aside>

  <div>
    <GoalComponent :goal="activeGoal" />
  </div>
</template>
