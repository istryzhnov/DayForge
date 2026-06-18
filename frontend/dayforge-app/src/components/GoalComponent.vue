<script setup lang="ts">
import type { Goal } from '../entities/GoalEntity'

defineProps<{
  goal: Goal | null
}>()
</script>

<template>
  <div v-if="goal">
    <h2>{{ goal.title }}</h2>
    <p v-if="goal.description">{{ goal.description }}</p>
    <small>{{ goal.status }}</small>
  </div>

  <div v-else>No goal selected</div>
</template>
