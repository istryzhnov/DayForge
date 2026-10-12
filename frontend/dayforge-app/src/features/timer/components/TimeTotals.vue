<script setup lang="ts">
import {
  TOTALS_RANGE_OPTIONS,
  useTimeTotals,
} from '../composables/useTimeTotals'

const {
  range,
  totals,
  grandTotalLabel,
  barWidth,
  shareLabel,
  durationLabel,
  sessionLabel,
} = useTimeTotals()
</script>

<template>
  <section class="time-totals">
    <header class="time-totals__head">
      <div class="settings-chips">
        <button
          v-for="option in TOTALS_RANGE_OPTIONS"
          :key="option.id"
          class="theme-chip"
          :class="{ active: range === option.id }"
          type="button"
          @click="range = option.id"
        >
          {{ option.label }}
        </button>
      </div>
      <strong class="time-totals__grand">{{ grandTotalLabel }}</strong>
    </header>

    <p v-if="totals.length === 0" class="timer-history__empty">
      No time tracked in this stretch yet.
    </p>

    <div v-for="total in totals" :key="total.key" class="time-total">
      <div class="time-total__row">
        <span class="time-total__title">{{ total.title }}</span>
        <span class="time-total__value">
          {{ durationLabel(total) }}
          <em v-if="shareLabel(total)">{{ shareLabel(total) }}</em>
        </span>
      </div>
      <div class="time-total__bar">
        <span :style="{ width: barWidth(total) }"></span>
      </div>
      <span class="time-total__sessions">{{ sessionLabel(total) }}</span>
    </div>
  </section>
</template>
