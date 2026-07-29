<script setup lang="ts">
import GoalHeader from './GoalHeader.vue'

defineProps<{
  title: string
  description: string
  status: string
  totalCount: number
  majorCount: number
  subCount: number
  isAllMode: boolean
  showMajorTasks: boolean
  onToggleShowMajorTasks: (value: boolean) => void
}>()
</script>

<template>
  <div>
    <GoalHeader
      :title="title"
      :description="description"
      :status="status"
      :total-count="totalCount"
      :major-count="majorCount"
      :sub-count="subCount"
    />

    <label v-if="isAllMode" class="major-toggle">
      <input
        type="checkbox"
        :checked="showMajorTasks"
        @change="
          onToggleShowMajorTasks(($event.target as HTMLInputElement).checked)
        "
      />
      Show major tasks
    </label>
  </div>
</template>
