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
      <circle class="timer-display__track" cx="60" cy="60" :r="RADIUS" />
      <circle
        class="timer-display__progress"
        cx="60"
        cy="60"
        :r="RADIUS"
        :stroke-dasharray="CIRCUMFERENCE"
        :stroke-dashoffset="dashOffset"
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
