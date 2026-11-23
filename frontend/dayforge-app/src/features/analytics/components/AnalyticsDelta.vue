<script setup lang="ts">
import { computed } from 'vue'

/**
 * Change against the previous period. Up uses the accent, down the major
 * colour; a value of zero is shown muted without an arrow.
 */
const props = defineProps<{
  value: number | null
  /** "%" for percent changes, empty for counts. */
  unit?: string
  /** Text read after the value, e.g. "vs previous". */
  suffix?: string
  upLabel: string
  downLabel: string
}>()

const direction = computed(() => {
  if (props.value === null || props.value === 0) return 'flat'
  return props.value > 0 ? 'up' : 'down'
})

/** Counts carry a sign ("+3", "−2"); percent changes show the arrow alone. */
const amount = computed(() => {
  if (props.value === null) return ''
  if (props.unit) return `${Math.abs(props.value)}${props.unit}`
  const sign = props.value > 0 ? '+' : '−'
  return `${sign}${Math.abs(props.value)}`
})

const srText = computed(() => {
  if (direction.value === 'up') return props.upLabel
  if (direction.value === 'down') return props.downLabel
  return ''
})
</script>

<template>
  <span
    v-if="direction === 'flat' && value !== null"
    class="analytics-delta is-flat"
    aria-hidden="true"
    >=</span
  >
  <span
    v-else-if="value !== null"
    class="analytics-delta"
    :class="`is-${direction}`"
  >
    <svg
      v-if="direction !== 'flat'"
      class="analytics-delta__arrow"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path v-if="direction === 'up'" d="M12 19V5M6 11l6-6 6 6"></path>
      <path v-else d="M12 5v14M6 13l6 6 6-6"></path>
    </svg>
    <span class="analytics-delta__value">{{ amount }}</span>
    <span v-if="srText" class="analytics-delta__sr">{{ srText }}</span>
    <span v-if="suffix" class="analytics-delta__suffix">{{ suffix }}</span>
  </span>
</template>

<style scoped>
.analytics-delta {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  min-width: max-content;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  color: var(--muted);
}

.analytics-delta.is-up {
  color: var(--accent);
}

.analytics-delta.is-down {
  color: var(--major);
}

.analytics-delta__arrow {
  flex: 0 0 auto;
  width: 0.875rem;
  height: 0.875rem;
}

.analytics-delta__suffix {
  font-weight: 600;
  color: var(--muted);
}

.analytics-delta__sr {
  position: absolute;
  width: 0.0625rem;
  height: 0.0625rem;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
