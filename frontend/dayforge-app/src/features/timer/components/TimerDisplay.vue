<script setup lang="ts">
import { computed } from 'vue'
import type { TimerStatus } from '../../../entities/TimerEntity'

const props = withDefaults(
  defineProps<{
    value: string
    caption?: string
    progress: number
    status: TimerStatus
    variant?: 'compact' | 'large'
  }>(),
  { variant: 'compact', caption: '' },
)

const RADIUS = 52
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const clamped = computed(() => Math.min(1, Math.max(0, props.progress)))
const dashOffset = computed(() => CIRCUMFERENCE * (1 - clamped.value))
const percent = computed(() => `${clamped.value * 100}%`)

/**
 * The white knob sits where the progress arc ends. The arc starts at 3 o'clock
 * inside the SVG; the SVG itself is rotated to start at 12 o'clock.
 */
const knob = computed(() => {
  const angle = clamped.value * 2 * Math.PI
  return {
    x: 60 + RADIUS * Math.cos(angle),
    y: 60 + RADIUS * Math.sin(angle),
  }
})
</script>

<template>
  <div
    class="timer-display"
    :class="[`timer-display--${variant}`, `is-${status}`]"
  >
    <svg
      v-if="variant === 'large'"
      class="timer-display__ring"
      viewBox="0 0 120 120"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="timer-ring-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style="stop-color: var(--accent)" />
          <stop offset="100%" style="stop-color: var(--major)" />
        </linearGradient>
      </defs>
      <circle class="timer-display__track" cx="60" cy="60" :r="RADIUS" />
      <circle
        class="timer-display__progress"
        :class="{ 'is-empty': clamped === 0 }"
        cx="60"
        cy="60"
        :r="RADIUS"
        :stroke-dasharray="CIRCUMFERENCE"
        :stroke-dashoffset="dashOffset"
      />
      <circle
        v-if="clamped > 0"
        class="timer-display__knob"
        :cx="knob.x"
        :cy="knob.y"
        r="4.5"
      />
    </svg>

    <div class="timer-display__readout">
      <strong class="timer-display__value">{{ value }}</strong>
      <span v-if="caption" class="timer-display__caption">{{ caption }}</span>
    </div>

    <div v-if="variant === 'compact'" class="timer-display__bar">
      <span :style="{ width: percent }"></span>
    </div>
  </div>
</template>
