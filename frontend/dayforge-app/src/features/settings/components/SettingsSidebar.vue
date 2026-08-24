<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import type { Goal, GoalTheme } from '../../../entities/GoalEntity'
import type { ID } from '../../../entities/types'
import { useTheme } from '../../../composables/useTheme'
import SettingsMenu from './SettingsMenu.vue'
import ThemeSection from './ThemeSection.vue'
import ColorsSection from './ColorsSection.vue'
import WorkspaceSection from './WorkspaceSection.vue'
import RemindersSection from './RemindersSection.vue'
import CalendarSection from './CalendarSection.vue'
import BehaviorSection from './BehaviorSection.vue'
import FormatSection from './FormatSection.vue'
import DataSection from './DataSection.vue'
import ProjectThemeEditor from './ProjectThemeEditor.vue'
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
  (e: 'toggle-notifications'): void
  (e: 'export-data'): void
  (e: 'import-data', payload: unknown): void
  (e: 'clear-data'): void
  (e: 'open-starter'): void
}>()

const { activeSection, openSection, back, close, escape } = useSettingsPanel()
// Only the per-project editor needs live theme state here; every other section
// reads what it needs itself.
const { themeMode, surfaces, effectivePalette } = useTheme()

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

      <BehaviorSection v-else-if="activeSection === 'behavior'" />

      <FormatSection v-else-if="activeSection === 'format'" />

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
