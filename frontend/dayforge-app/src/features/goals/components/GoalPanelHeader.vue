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
  showToolbar: boolean
  boardEnabled: boolean
  hasNotes: boolean
  notesOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'set-board', enabled: boolean): void
  (e: 'toggle-notes'): void
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
    :show-toolbar="showToolbar"
    :board-enabled="boardEnabled"
    :has-notes="hasNotes"
    :notes-open="notesOpen"
    @set-board="(enabled) => emit('set-board', enabled)"
    @toggle-notes="emit('toggle-notes')"
  />
</template>
