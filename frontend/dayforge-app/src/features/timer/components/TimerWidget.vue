<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { TIMER_STATUS } from '../../../entities/constants'
import TimerDisplay from './TimerDisplay.vue'
import TimerControls from './TimerControls.vue'
import { useTimerView } from '../composables/useTimerView'

import AppIcon from '../../../shared/ui/AppIcon.vue'

const { t } = useI18n()

const emit = defineEmits<{ (e: 'open-timer'): void }>()

const {
  timer,
  displayLabel,
  progress,
  statusLabel,
  taskLabel,
  todayLabel,
  primaryLabel,
  canStop,
  canSkip,
  resumeOrStart,
  stop,
  skipPhase,
} = useTimerView()

/** Running right now: the widget glows and its status dot breathes. */
const isRunning = computed(() => timer.value.status === TIMER_STATUS.RUNNING)
</script>

<template>
  <section
    class="timer-widget"
    :class="{ 'is-live': isRunning }"
    :aria-label="t('timer.title')"
    data-tip-anchor="sidebar-timer"
  >
    <header class="timer-widget__head">
      <span class="timer-widget__status">
        <span v-if="isRunning" class="df-live-dot" aria-hidden="true"></span>
        {{ statusLabel }}
      </span>
      <button
        class="timer-widget__expand"
        type="button"
        :title="t('timer.openTimerScreen')"
        :aria-label="t('timer.openTimerScreen')"
        @click="emit('open-timer')"
      >
        <AppIcon name="maximize" :size="14" />
      </button>
    </header>

    <TimerDisplay
      :value="displayLabel"
      :progress="progress"
      :status="timer.status"
      variant="compact"
    />

    <p class="timer-widget__task" :title="taskLabel">{{ taskLabel }}</p>

    <TimerControls
      :primary-label="primaryLabel"
      :can-stop="canStop"
      :can-skip="canSkip"
      @primary="resumeOrStart"
      @stop="stop"
      @skip="skipPhase"
    />

    <p class="timer-widget__today">
      {{ t('timer.todayWidget', { time: todayLabel }) }}
    </p>
  </section>
</template>
