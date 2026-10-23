<script setup lang="ts">
import { useGoalPanelHeader } from '../composables/useGoalPanelHeader'
import ProjectToolbar from './ProjectToolbar.vue'
import ProjectBudgetChip from './ProjectBudgetChip.vue'
import type { BudgetStanding } from '../../analytics/composables/projectBudget'

const props = defineProps<{
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
  budget: BudgetStanding | null
}>()

const emit = defineEmits<{
  (e: 'set-board', enabled: boolean): void
  (e: 'toggle-notes'): void
}>()

const { statusBadge, isProjectSettingsOpen, toggleProjectSettings } =
  useGoalPanelHeader(props)
</script>

<template>
  <header class="goal-panel-header">
    <div>
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>
    </div>

    <div class="goal-panel-header__aside">
      <span v-if="statusBadge" class="goal-status">{{ statusBadge }}</span>
      <ProjectBudgetChip v-if="budget" :standing="budget" />
      <ProjectToolbar
        v-if="showToolbar"
        :board-enabled="boardEnabled"
        :has-notes="hasNotes"
        :notes-open="notesOpen"
        @set-board="(enabled) => emit('set-board', enabled)"
        @toggle-notes="emit('toggle-notes')"
      />
      <button
        v-if="showSettings"
        class="goal-settings-btn"
        :class="{ 'is-active': isProjectSettingsOpen }"
        type="button"
        title="Name, status, colours, rate"
        :aria-expanded="isProjectSettingsOpen"
        @click="toggleProjectSettings"
      >
        <span aria-hidden="true">⚙</span>
        <span>Project settings</span>
      </button>
    </div>
  </header>
  <div class="goal-kpi-row">
    <article class="kpi">
      <h3>Total</h3>
      <p>{{ totalCount }}</p>
    </article>
    <article class="kpi">
      <h3>Projects</h3>
      <p>{{ projectCount }}</p>
    </article>
    <article class="kpi">
      <h3>Tasks</h3>
      <p>{{ taskCount }}</p>
    </article>
  </div>
</template>
