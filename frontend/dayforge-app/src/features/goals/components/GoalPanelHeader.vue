<script setup lang="ts">
import GoalHeader from './GoalHeader.vue'

defineProps<{
  title: string
  description: string
  status: string
  totalCount: number
  projectCount: number
  taskCount: number
  showSettings: boolean
}>()
</script>

<template>
  <GoalHeader
    :title="title"
    :description="description"
    :status="status"
    :total-count="totalCount"
    :project-count="projectCount"
    :task-count="taskCount"
    :show-settings="showSettings"
  />
</template>
