<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import type { Goal, GoalTheme } from '../../../entities/GoalEntity'
import type { ID } from '../../../entities/types'
import { useTheme } from '../../../composables/useTheme'
import ThemeSection from './ThemeSection.vue'
import ColorsSection from './ColorsSection.vue'
import WorkspaceSection from './WorkspaceSection.vue'
import PlannerSection from './PlannerSection.vue'
import DataSection from './DataSection.vue'
import ProjectThemeEditor from './ProjectThemeEditor.vue'
import {
  SETTINGS_SECTION,
  useSettingsPanel,
  type SettingsSection,
} from '../composables/useSettingsPanel'

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
  (e: 'toggle-notifications'): void
  (e: 'export-data'): void
  (e: 'import-data', payload: unknown): void
  (e: 'clear-data'): void
  (e: 'open-starter'): void
}>()

const { activeSection, close } = useSettingsPanel()
// Only the per-project editor needs live theme state here; every other section
// reads what it needs itself.
const { themeMode, surfaces, effectivePalette } = useTheme()

const sections: { id: SettingsSection; label: string }[] = [
  { id: SETTINGS_SECTION.THEME, label: 'Theme' },
  { id: SETTINGS_SECTION.COLORS, label: 'Colours' },
  { id: SETTINGS_SECTION.PROJECT, label: 'Project' },
  { id: SETTINGS_SECTION.WORKSPACE, label: 'Workspace' },
  { id: SETTINGS_SECTION.PLANNER, label: 'Planner' },
  { id: SETTINGS_SECTION.DATA, label: 'Data' },
]

function handleGoalTheme(theme: GoalTheme | undefined) {
  if (!props.activeGoal) return
  emit('change-goal-theme', props.activeGoal.id, theme)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <section class="settings-panel" aria-label="Settings">
    <header class="settings-panel__head">
      <div>
        <strong>Settings</strong>
        <p>Make the workspace look and behave the way you want.</p>
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

    <nav class="settings-tabs">
      <button
        v-for="section in sections"
        :key="section.id"
        class="theme-chip"
        :class="{ active: activeSection === section.id }"
        type="button"
        :disabled="section.id === 'project' && !activeGoal"
        @click="activeSection = section.id"
      >
        {{ section.label }}
      </button>
    </nav>

    <div class="settings-panel__body">
      <ThemeSection v-if="activeSection === 'theme'" />

      <ColorsSection v-else-if="activeSection === 'colors'" />

      <WorkspaceSection v-else-if="activeSection === 'workspace'" />

      <PlannerSection
        v-else-if="activeSection === 'planner'"
        :notifications-supported="notificationsSupported"
        :notifications-enabled="notificationsEnabled"
        @toggle-notifications="emit('toggle-notifications')"
      />

      <DataSection
        v-else-if="activeSection === 'data'"
        :stats="dataStats"
        @export="emit('export-data')"
        @import="(payload) => emit('import-data', payload)"
        @clear="emit('clear-data')"
        @open-starter="emit('open-starter')"
      />

      <ProjectThemeEditor
        v-else-if="activeGoal"
        :goal="activeGoal"
        :mode="themeMode"
        :surfaces="surfaces"
        :palette="effectivePalette"
        @update="handleGoalTheme"
      />

      <p v-else class="settings-section__intro">
        Select a project in the left sidebar to give it its own colours.
      </p>
    </div>
  </section>
</template>
