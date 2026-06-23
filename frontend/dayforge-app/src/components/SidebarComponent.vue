<script setup lang="ts">
import type { Goal } from '../entities/GoalEntity'
import type { ID } from '../entities/types'

defineProps<{
  goals: Goal[]
  activeGoalId: ID | null
  taskCountByGoal: Record<ID, number>
  totalTaskCount: number
}>()

const emit = defineEmits<{
  (e: 'select-goal', goalId: ID | null): void
}>()
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
  </div>
</template>
