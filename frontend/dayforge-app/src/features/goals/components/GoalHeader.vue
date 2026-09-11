<script setup lang="ts">
import { useGoalPanelHeader } from '../composables/useGoalPanelHeader'

const props = defineProps<{
  title: string
  description: string
  status: string
  totalCount: number
  projectCount: number
  taskCount: number
  showSettings: boolean
}>()

const { statusBadge, openProjectSettings } = useGoalPanelHeader(props)
</script>

<template>
  <header class="goal-panel-header">
    <div>
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>
    </div>

    <div class="goal-panel-header__aside">
      <span v-if="statusBadge" class="goal-status">{{ statusBadge }}</span>
      <button
        v-if="showSettings"
        class="goal-settings-btn"
        type="button"
        title="Name, status, colours, rate"
        @click="openProjectSettings"
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
