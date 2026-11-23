<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '../../../shared/ui/AppIcon.vue'
import type { ActiveView } from '../../../entities/types'
import { useTimer } from '../../../shared/composables/useTimer'
import { useHotkeyOverlay } from '../../../shared/composables/useHotkeys'
import { useModules } from '../../../shared/composables/useModules'
import {
  useSettingsPanel,
  SETTINGS_SECTION,
} from '../../../shared/composables/useSettingsPanel'
import type { AppIconName } from '../../../shared/ui/appIconPaths'
import { useLiveTimerMeta } from '../composables/useLiveTimerMeta'
import type { Goal } from '../../../entities/GoalEntity'
import type { TaskTemplate } from '../../../entities/TaskEntity'

/**
 * The phone's main navigation: a floating bar of glass at the bottom of the
 * screen. Projects, Calendar, a raised quick-add button, Analytics and Timer;
 * the active view shows its label, the rest stay icon-only. While a timer
 * runs, its tab carries the breathing amber dot and a live capsule floats
 * above the bar.
 */
const props = withDefaults(
  defineProps<{
    activeView: ActiveView
    /** Projects and task templates, so the capsule prices like the Timer view. */
    goals?: Goal[]
    templates?: TaskTemplate[]
  }>(),
  { goals: () => [], templates: () => [] },
)
const emit = defineEmits<{ (e: 'select-view', view: ActiveView): void }>()

const { t } = useI18n()
const { isLive, isRunning, displayLabel, task, pause, resume } = useTimer()
const { openQuickAdd } = useHotkeyOverlay()
const { isOn } = useModules()
const { open: openSettingsPanel } = useSettingsPanel()
const { meta: capsuleMetaLine } = useLiveTimerMeta({
  goals: () => props.goals,
  templates: () => props.templates,
})

type Tab = {
  view: ActiveView | 'modules'
  icon: AppIconName
  labelKey: string
}

/** Projects first, then the optional tabs in the mockup's order. */
const GOALS_TAB: Tab = {
  view: 'goals',
  icon: 'check-square',
  labelKey: 'sidebar.projects',
}
const OPTIONAL_TABS: Tab[] = [
  { view: 'calendar', icon: 'calendar', labelKey: 'sidebar.calendar' },
  { view: 'timer', icon: 'timer', labelKey: 'sidebar.timer' },
  { view: 'analytics', icon: 'chart', labelKey: 'sidebar.analytics' },
]
const MODULES_TAB: Tab = {
  view: 'modules',
  icon: 'modules',
  labelKey: 'modules.sectionName',
}

function tabOn(view: Tab['view']): boolean {
  if (view === 'calendar') return isOn('calendar')
  if (view === 'timer') return isOn('timer')
  if (view === 'analytics') return isOn('analytics')
  return true
}

/**
 * Projects plus the tabs that are on. With fewer than four tabs, a Modules
 * tab fills the bar, so the bar always has four tabs or more to balance.
 * The raised + sits in the middle; the tabs split evenly either side of it.
 */
const items = computed<Tab[]>(() => {
  const list = [GOALS_TAB, ...OPTIONAL_TABS.filter((tab) => tabOn(tab.view))]
  if (list.length < 4) list.push(MODULES_TAB)
  return list
})
const LEFT = computed(() =>
  items.value.slice(0, Math.ceil(items.value.length / 2)),
)
const RIGHT = computed(() =>
  items.value.slice(Math.ceil(items.value.length / 2)),
)

/** Planned and archive live under Projects, so its tab stays lit there. */
const current = computed<ActiveView>(() =>
  props.activeView === 'planned' || props.activeView === 'archive'
    ? 'goals'
    : props.activeView,
)

/**
 * The live capsule floats above the bar while a timer runs. On the Timer view
 * the screen already shows the timer, so the capsule steps aside there.
 */
const showCapsule = computed(() => isLive.value && current.value !== 'timer')

/** Lets the page reserve room under its last row for the capsule. */
watch(
  showCapsule,
  (on) => document.body.classList.toggle('has-timer-capsule', on),
  { immediate: true },
)
onUnmounted(() => document.body.classList.remove('has-timer-capsule'))

const capsuleTitle = computed(() => task.value?.taskTitle || t('timer.noTask'))

function openTimer() {
  if (!isOn('timer')) return
  emit('select-view', 'timer')
}

/** The Modules tab opens its settings section; the others change the view. */
function pick(view: Tab['view']) {
  if (view === 'modules') {
    openSettingsPanel(SETTINGS_SECTION.MODULES)
    return
  }
  emit('select-view', view)
}

function toggleRunning() {
  if (isRunning.value) pause()
  else resume()
}
</script>

<template>
  <div v-if="showCapsule" class="mobile-timer-capsule">
    <button
      class="mobile-timer-capsule__open"
      type="button"
      :aria-label="t('sidebar.openTimer', { time: displayLabel })"
      :disabled="!isOn('timer')"
      @click="openTimer"
    >
      <span class="df-live-dot" aria-hidden="true"></span>
      <span class="mobile-timer-capsule__text">
        <span class="mobile-timer-capsule__title">{{ capsuleTitle }}</span>
        <span class="mobile-timer-capsule__meta">{{ capsuleMetaLine }}</span>
      </span>
    </button>
    <span class="mobile-timer-capsule__time">{{ displayLabel }}</span>
    <button
      class="mobile-timer-capsule__btn"
      type="button"
      :aria-label="isRunning ? t('timer.pause') : t('timer.resume')"
      :title="isRunning ? t('timer.pause') : t('timer.resume')"
      @click="toggleRunning"
    >
      <AppIcon :name="isRunning ? 'pause' : 'play'" :size="18" />
    </button>
  </div>

  <nav class="mobile-tabbar" :aria-label="t('sidebar.navigation')">
    <div class="mobile-tabbar__half">
      <button
        v-for="tab in LEFT"
        :key="tab.view"
        class="mobile-tabbar__tab"
        :class="{ 'is-active': current === tab.view }"
        type="button"
        :aria-current="current === tab.view ? 'page' : undefined"
        :aria-label="t(tab.labelKey)"
        @click="pick(tab.view)"
      >
        <AppIcon :name="tab.icon" :size="20" />
        <span v-if="current === tab.view" class="mobile-tabbar__label">{{
          t(tab.labelKey)
        }}</span>
      </button>
    </div>

    <button
      class="mobile-tabbar__add"
      type="button"
      :aria-label="t('sidebar.quickAddTask')"
      :title="t('sidebar.quickAddTask')"
      @click="openQuickAdd"
    >
      <AppIcon name="plus" :size="24" />
    </button>

    <div class="mobile-tabbar__half">
      <button
        v-for="tab in RIGHT"
        :key="tab.view"
        class="mobile-tabbar__tab"
        :class="{ 'is-active': current === tab.view }"
        type="button"
        :aria-current="current === tab.view ? 'page' : undefined"
        :aria-label="t(tab.labelKey)"
        @click="pick(tab.view)"
      >
        <AppIcon :name="tab.icon" :size="20" />
        <span v-if="current === tab.view" class="mobile-tabbar__label">{{
          t(tab.labelKey)
        }}</span>
        <span
          v-if="tab.view === 'timer' && isLive && current !== 'timer'"
          class="df-live-dot mobile-tabbar__live"
          aria-hidden="true"
        ></span>
      </button>
    </div>
  </nav>
</template>
