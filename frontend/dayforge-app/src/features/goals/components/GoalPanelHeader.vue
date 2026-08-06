<script setup lang="ts">
import GoalHeader from './GoalHeader.vue'

defineProps<{
  title: string
  description: string
  status: string
  totalCount: number
  majorCount: number
  subCount: number
  showSettings: boolean
  accentColor?: string
}>()

const emit = defineEmits<{
  (e: 'delete-goal'): void
  (e: 'change-color', color: string | undefined): void
}>()
</script>

<template>
  <GoalHeader
    :title="title"
    :description="description"
    :status="status"
    :total-count="totalCount"
    :major-count="majorCount"
    :sub-count="subCount"
    :show-settings="showSettings"
    :accent-color="accentColor"
    @delete-goal="emit('delete-goal')"
    @change-color="(color) => emit('change-color', color)"
  />
</template>
