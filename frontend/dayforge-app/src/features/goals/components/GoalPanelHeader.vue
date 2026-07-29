<script setup lang="ts">
import GoalHeader from './GoalHeader.vue'

defineProps<{
  title: string
  description: string
  status: string
  totalCount: number
  majorCount: number
  subCount: number
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
  />
</template>
