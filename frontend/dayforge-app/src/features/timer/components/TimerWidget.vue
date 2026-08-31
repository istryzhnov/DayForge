<script setup lang="ts">
import TimerDisplay from './TimerDisplay.vue'
import TimerControls from './TimerControls.vue'
import { useTimerWidget } from '../composables/useTimerWidget'

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
  primary,
  stop,
  skipPhase,
} = useTimerWidget()
</script>

<template>
  <section class="timer-widget" aria-label="Timer">
    <header class="timer-widget__head">
      <span class="timer-widget__status">{{ statusLabel }}</span>
      <button
        class="timer-widget__expand"
        type="button"
        title="Open the timer screen"
        aria-label="Open the timer screen"
        @click="emit('open-timer')"
      >
        ⤢
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
      @primary="primary"
      @stop="stop"
      @skip="skipPhase"
    />

    <p class="timer-widget__today">Today: {{ todayLabel }}</p>
  </section>
</template>
