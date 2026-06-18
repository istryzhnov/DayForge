<script setup lang="ts">
import type { Goal } from '../entities/GoalEntity'
import type { ID } from '../entities/types'

defineProps<{
  goals: Goal[]
  activeGoalId: ID | null
}>()

const emit = defineEmits<{
  (e: 'select-goal', goalId: ID): void
}>()
</script>

<template>
  <div>
    <button
      v-for="goal in goals"
      :key="goal.id"
      :class="{ active: goal.id === activeGoalId }"
      @click="emit('select-goal', goal.id)"
    >
      {{ goal.title }}
    </button>
  </div>
</template>
