<script setup lang="ts">
import { computed, onMounted, onUnmounted, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Goal } from '../../../entities/GoalEntity'
import AppIcon from '../../../components/AppIcon.vue'
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
import { useMediaQuery } from '../../../composables/useMediaQuery'
import { useOpenFocusTrap } from '../../../composables/useFocusTrap'

const { t } = useI18n()

defineProps<{
  goals: Goal[]
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
      title: t('settings.panelTitle'),
      description: t('settings.panelDescription'),
    }
  }
  const meta = sectionMeta(activeSection.value)
  return { title: t(meta.labelKey), description: t(meta.descriptionKey) }
})

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') escape()
}

/** Narrow screens float this panel over the workspace: then it behaves as a dialog. */
const rootRef = useTemplateRef<HTMLElement>('rootRef')
const isOverlay = useMediaQuery('(max-width: 1240px)')
useOpenFocusTrap(
  () => rootRef.value,
  () => isOverlay.value,
  { modal: false },
)

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <section
    ref="rootRef"
    class="settings-panel"
    :role="isOverlay ? 'dialog' : undefined"
    :aria-label="t('settings.panelTitle')"
  >
    <header class="settings-panel__head">
      <button
        v-if="activeSection !== null"
        class="ui-icon-btn ui-icon-btn--outlined settings-panel__back"
        type="button"
        :aria-label="t('settings.panelBack')"
        @click="back"
      >
        <AppIcon name="chevron-left" :size="16" />
      </button>
      <div class="settings-panel__title">
        <strong>{{ heading.title }}</strong>
        <p>{{ heading.description }}</p>
      </div>
      <button
        class="ui-icon-btn ui-icon-btn--outlined settings-panel__close"
        type="button"
        :aria-label="t('settings.panelClose')"
        @click="close"
      >
        <AppIcon name="close" :size="14" />
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

      <BehaviorSection
        v-else-if="activeSection === 'behavior'"
        :goals="goals"
      />

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

      <ProjectSection v-else-if="activeGoal" :goal="activeGoal" />

      <p v-else class="settings-section__intro">
        {{ t('settings.panelProjectHint') }}
      </p>
    </div>
  </section>
</template>
