<script setup lang="ts">
import type { Goal } from '../../../entities/GoalEntity'
import type { ID } from '../../../entities/types'
import NewGoalComponent from './NewGoalComponent.vue'
import { useSidebarState } from '../composables/useSidebarState'

defineProps<{
  goals: Goal[]
  activeGoalId: ID | null
  taskCountByGoal: Record<ID, number>
  totalTaskCount: number
}>()

const emit = defineEmits<{
  (e: 'select-goal', goalId: ID | null): void
  (e: 'create-goal', title: string, description: string): void
}>()

const {
  showNewGoalForm,
  openNewGoalForm,
  closeNewGoalForm,
  selectGoal,
  createGoal,
} = useSidebarState({
  onSelectGoal: (goalId) => emit('select-goal', goalId),
  onCreateGoal: (title, description) => emit('create-goal', title, description),
})
</script>

<template>
  <div class="sidebar-shell">
    <div class="sidebar-brand">
      <span class="brand-dot"></span>
      <strong>DayForge</strong>
    </div>

    <p class="sidebar-caption">Goals</p>

    <button
      class="nav-goal-btn"
      :class="{ active: activeGoalId === null }"
      @click="selectGoal(null)"
    >
      <span>All Goals</span>
      <span class="goal-count">{{ totalTaskCount }}</span>
    </button>

    <button
      v-for="goal in goals"
      :key="goal.id"
      class="nav-goal-btn"
      :class="{ active: goal.id === activeGoalId }"
      @click="selectGoal(goal.id)"
    >
      <span>{{ goal.title }}</span>
      <span class="goal-count">{{ taskCountByGoal[goal.id] ?? 0 }}</span>
    </button>
    <div class="sidebar-actions">
      <button @click="openNewGoalForm" class="btn btn-primary">New Goal</button>
      <NewGoalComponent
        v-if="showNewGoalForm"
        @submit="createGoal"
        @cancel="closeNewGoalForm"
      />
    </div>
  </div>
</template>
