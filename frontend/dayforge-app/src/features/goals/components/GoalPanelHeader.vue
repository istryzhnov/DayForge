<script setup lang="ts">
import GoalHeader from './GoalHeader.vue'
import type { BudgetStanding } from '../../analytics/composables/projectBudget'
import type { PanelStats } from '../composables/projectPanelStats'

defineProps<{
  title: string
  color?: string
  status: string
  stats: PanelStats
  showSettings: boolean
  showToolbar: boolean
  boardEnabled: boolean
  hasNotes: boolean
  notesOpen: boolean
  budget: BudgetStanding | null
}>()

const emit = defineEmits<{
  (e: 'set-board', enabled: boolean): void
  (e: 'toggle-notes'): void
}>()
</script>

<template>
  <GoalHeader
    :title="title"
    :color="color"
    :status="status"
    :stats="stats"
    :show-settings="showSettings"
    :show-toolbar="showToolbar"
    :board-enabled="boardEnabled"
    :has-notes="hasNotes"
    :notes-open="notesOpen"
    :budget="budget"
    @set-board="(enabled) => emit('set-board', enabled)"
    @toggle-notes="emit('toggle-notes')"
  />
</template>
