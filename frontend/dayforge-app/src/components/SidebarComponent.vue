<script setup lang="ts">
import { ref } from 'vue'
import type { Goal } from '../entities/GoalEntity'
import type { ID } from '../entities/types'
import NewGoalComponent from './NewGoalComponent.vue'

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

const showNewGoalForm = ref(false)

function handleCreateGoal(title: string, description: string) {
  emit('create-goal', title, description)
  showNewGoalForm.value = false
}
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
      @click="emit('select-goal', null)"
    >
      <span>All Goals</span>
      <span class="goal-count">{{ totalTaskCount }}</span>
    </button>

    <button
      v-for="goal in goals"
      :key="goal.id"
      class="nav-goal-btn"
      :class="{ active: goal.id === activeGoalId }"
      @click="emit('select-goal', goal.id)"
    >
      <span>{{ goal.title }}</span>
      <span class="goal-count">{{ taskCountByGoal[goal.id] ?? 0 }}</span>
    </button>
    <div>
      <button @click="showNewGoalForm = true" class="btn btn-primary">
        New Goal
      </button>
      <NewGoalComponent
        v-if="showNewGoalForm"
        @submit="handleCreateGoal"
        @cancel="showNewGoalForm = false"
      />
    </div>
  </div>
</template>
