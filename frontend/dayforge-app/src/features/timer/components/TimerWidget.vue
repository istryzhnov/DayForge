<script setup lang="ts">
import TimerDisplay from './TimerDisplay.vue'
import TimerControls from './TimerControls.vue'
import { useTimerView } from '../composables/useTimerView'

import AppIcon from '../../../components/AppIcon.vue'

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
</script>

<template>
  <section
    class="timer-widget"
    aria-label="Timer"
    data-tip-anchor="sidebar-timer"
  >
    <header class="timer-widget__head">
      <span class="timer-widget__status">{{ statusLabel }}</span>
      <button
        class="timer-widget__expand"
        type="button"
        title="Open the timer screen"
        aria-label="Open the timer screen"
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

    <p class="timer-widget__today">Today: {{ todayLabel }}</p>
  </section>
</template>
