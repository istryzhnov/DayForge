<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '../../../shared/ui/AppIcon.vue'
import type { ActiveView } from '../../../entities/types'
import { useTimer } from '../../../shared/composables/useTimer'
import { useHotkeyOverlay } from '../../../shared/composables/useHotkeys'

/**
 * The phone's main navigation: a floating bar of glass at the bottom of the
 * screen. Projects, Calendar, a raised quick-add button, Analytics and Timer;
 * the active view shows its label, the rest stay icon-only. While a timer
 * runs, its tab carries the breathing amber dot and a live capsule floats
 * above the bar.
 */
const props = defineProps<{ activeView: ActiveView }>()
const emit = defineEmits<{ (e: 'select-view', view: ActiveView): void }>()

const { t } = useI18n()
const { isLive, isRunning, displayLabel, task, pause, resume } = useTimer()
const { openQuickAdd } = useHotkeyOverlay()

type Tab = {
  view: ActiveView
  icon: 'check-square' | 'calendar' | 'chart' | 'timer'
  labelKey: string
}

const LEFT: Tab[] = [
  { view: 'goals', icon: 'check-square', labelKey: 'sidebar.projects' },
  { view: 'calendar', icon: 'calendar', labelKey: 'sidebar.calendar' },
]
const RIGHT: Tab[] = [
  { view: 'analytics', icon: 'chart', labelKey: 'sidebar.analytics' },
  { view: 'timer', icon: 'timer', labelKey: 'sidebar.timer' },
]

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
  emit('select-view', 'timer')
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
      @click="openTimer"
    >
      <span class="df-live-dot" aria-hidden="true"></span>
      <span class="mobile-timer-capsule__title">{{ capsuleTitle }}</span>
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
    <button
      v-for="tab in LEFT"
      :key="tab.view"
      class="mobile-tabbar__tab"
      :class="{ 'is-active': current === tab.view }"
      type="button"
      :aria-current="current === tab.view ? 'page' : undefined"
      :aria-label="t(tab.labelKey)"
      @click="emit('select-view', tab.view)"
    >
      <AppIcon :name="tab.icon" :size="20" />
      <span v-if="current === tab.view" class="mobile-tabbar__label">{{
        t(tab.labelKey)
      }}</span>
    </button>

    <button
      class="mobile-tabbar__add"
      type="button"
      :aria-label="t('sidebar.quickAddTask')"
      :title="t('sidebar.quickAddTask')"
      @click="openQuickAdd"
    >
      <AppIcon name="plus" :size="24" />
    </button>

    <button
      v-for="tab in RIGHT"
      :key="tab.view"
      class="mobile-tabbar__tab"
      :class="{ 'is-active': current === tab.view }"
      type="button"
      :aria-current="current === tab.view ? 'page' : undefined"
      :aria-label="t(tab.labelKey)"
      @click="emit('select-view', tab.view)"
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
  </nav>
</template>
