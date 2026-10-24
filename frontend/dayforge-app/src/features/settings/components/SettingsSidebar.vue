<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import type { Goal, GoalTheme } from '../../../entities/GoalEntity'
import type { GoalStatus, ID } from '../../../entities/types'
import type { ProjectBudget } from '../../analytics/composables/projectBudget'
import SettingsMenu from './SettingsMenu.vue'
import ClientsSection from './ClientsSection.vue'
import ThemeSection from './ThemeSection.vue'
import ColorsSection from './ColorsSection.vue'
import WorkspaceSection from './WorkspaceSection.vue'
import RemindersSection from './RemindersSection.vue'
import CalendarSection from './CalendarSection.vue'
import TimerSection from './TimerSection.vue'
import BehaviorSection from './BehaviorSection.vue'
import FormatSection from './FormatSection.vue'
import DataSection from './DataSection.vue'
import ProjectSection from './ProjectSection.vue'
import { sectionMeta, useSettingsPanel } from '../composables/useSettingsPanel'

const props = defineProps<{
  activeGoal: Goal | null
  notificationsSupported: boolean
  notificationsEnabled: boolean
  dataStats: {
    goals: number
    templates: number
    rows: number
    kilobytes: number
  }
}>()

const emit = defineEmits<{
  (e: 'change-goal-theme', goalId: ID, theme: GoalTheme | undefined): void
  (e: 'change-goal-rate', goalId: ID, hourlyRate: number | undefined): void
  (e: 'change-goal-icon', goalId: ID, icon: string | undefined): void
  (e: 'change-goal-budget', goalId: ID, budget: ProjectBudget | undefined): void
  (e: 'change-goal-client', goalId: ID, clientId: ID | undefined): void
  (e: 'change-goal-board', goalId: ID, enabled: boolean): void
  (
    e: 'change-goal-details',
    goalId: ID,
    title: string,
    description: string,
  ): void
  (e: 'change-goal-status', goalId: ID, status: GoalStatus): void
  (e: 'delete-goal', goalId: ID): void
  (e: 'toggle-notifications'): void
  (e: 'export-data'): void
  (e: 'import-data', payload: unknown): void
  (e: 'restore-snapshot', payload: unknown): void
  (e: 'clear-data'): void
  (e: 'open-starter'): void
}>()

const { activeSection, openSection, back, close, escape } = useSettingsPanel()

/** The header is either the panel's own title or the open section's. */
const heading = computed(() => {
  if (activeSection.value === null) {
    return {
      title: 'Settings',
      description: 'Everything you can change, grouped by what it touches.',
    }
  }
  const meta = sectionMeta(activeSection.value)
  return { title: meta.label, description: meta.description }
})

function handleGoalTheme(theme: GoalTheme | undefined) {
  if (!props.activeGoal) return
  emit('change-goal-theme', props.activeGoal.id, theme)
}

function handleGoalRate(hourlyRate: number | undefined) {
  if (!props.activeGoal) return
  emit('change-goal-rate', props.activeGoal.id, hourlyRate)
}

function handleGoalIcon(icon: string | undefined) {
  if (!props.activeGoal) return
  emit('change-goal-icon', props.activeGoal.id, icon)
}

function handleGoalBudget(budget: ProjectBudget | undefined) {
  if (!props.activeGoal) return
  emit('change-goal-budget', props.activeGoal.id, budget)
}

function handleGoalClient(clientId: ID | undefined) {
  if (!props.activeGoal) return
  emit('change-goal-client', props.activeGoal.id, clientId)
}

function handleGoalBoard(enabled: boolean) {
  if (!props.activeGoal) return
  emit('change-goal-board', props.activeGoal.id, enabled)
}

function handleGoalDetails(title: string, description: string) {
  if (!props.activeGoal) return
  emit('change-goal-details', props.activeGoal.id, title, description)
}

function handleGoalStatus(status: GoalStatus) {
  if (!props.activeGoal) return
  emit('change-goal-status', props.activeGoal.id, status)
}

function handleGoalDelete() {
  if (!props.activeGoal) return
  emit('delete-goal', props.activeGoal.id)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') escape()
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <section class="settings-panel" aria-label="Settings">
    <header class="settings-panel__head">
      <button
        v-if="activeSection !== null"
        class="settings-panel__back"
        type="button"
        aria-label="Back to all settings"
        @click="back"
      >
        ‹
      </button>
      <div class="settings-panel__title">
        <strong>{{ heading.title }}</strong>
        <p>{{ heading.description }}</p>
      </div>
      <button
        class="settings-panel__close"
        type="button"
        aria-label="Close settings"
        @click="close"
      >
        ✕
      </button>
    </header>

    <div class="settings-panel__body">
      <SettingsMenu
        v-if="activeSection === null"
        :active-goal="activeGoal"
        :notifications-enabled="notificationsEnabled"
        :data-stats="dataStats"
        @open="openSection"
      />

      <ThemeSection v-else-if="activeSection === 'theme'" />

      <ColorsSection v-else-if="activeSection === 'colors'" />

      <WorkspaceSection v-else-if="activeSection === 'workspace'" />

      <RemindersSection
        v-else-if="activeSection === 'reminders'"
        :notifications-supported="notificationsSupported"
        :notifications-enabled="notificationsEnabled"
        @toggle-notifications="emit('toggle-notifications')"
      />

      <CalendarSection v-else-if="activeSection === 'calendar'" />

      <TimerSection v-else-if="activeSection === 'timer'" />

      <BehaviorSection v-else-if="activeSection === 'behavior'" />

      <FormatSection v-else-if="activeSection === 'format'" />

      <ClientsSection v-else-if="activeSection === 'clients'" />

      <DataSection
        v-else-if="activeSection === 'data'"
        :stats="dataStats"
        @export="emit('export-data')"
        @import="(payload) => emit('import-data', payload)"
        @restore-snapshot="(payload) => emit('restore-snapshot', payload)"
        @clear="emit('clear-data')"
        @open-starter="emit('open-starter')"
      />

      <ProjectSection
        v-else-if="activeGoal"
        :goal="activeGoal"
        @update-details="handleGoalDetails"
        @update-status="handleGoalStatus"
        @update-theme="handleGoalTheme"
        @update-rate="handleGoalRate"
        @update-budget="handleGoalBudget"
        @update-icon="handleGoalIcon"
        @update-client="handleGoalClient"
        @update-board="handleGoalBoard"
        @delete="handleGoalDelete"
      />

      <p v-else class="settings-section__intro">
        Open a project in the left sidebar to edit its name, status, colours and
        rate.
      </p>
    </div>
  </section>
</template>
