<script setup lang="ts">
import { computed } from 'vue'
import {
  foldSmallShares,
  type ShareInput,
} from '../../../composables/analytics/charts'

const MAX_SLICES = 6

const props = defineProps<{
  shares: ShareInput[]
  caption: string
  formatHours: (totalMs: number) => string
  formatShare: (totalMs: number) => string
}>()

const slices = computed(() => {
  const folded = foldSmallShares(props.shares, MAX_SLICES)
  const totalMs = folded.reduce((sum, share) => sum + share.totalMs, 0)
  let cursor = 0

  return folded.map((share) => {
    const start = cursor
    cursor += totalMs === 0 ? 0 : (share.totalMs / totalMs) * 100

    return {
      key: share.key,
      label: share.label,
      totalMs: share.totalMs,
      start,
      end: cursor,
      color: share.color ?? 'var(--muted)',
    }
  })
})

const totalMs = computed(() =>
  slices.value.reduce((sum, slice) => sum + slice.totalMs, 0),
)

const isEmpty = computed(() => totalMs.value === 0)

const background = computed(() => {
  if (isEmpty.value) return ''

  const stops = slices.value.map(
    (slice) => `${slice.color} ${slice.start}% ${slice.end}%`,
  )
  return `conic-gradient(${stops.join(', ')})`
})

const summary = computed(() => {
  if (isEmpty.value) return `${props.caption}. Nothing tracked.`

  const parts = slices.value.map(
    (slice) => `${slice.label} ${props.formatShare(slice.totalMs)}`,
  )
  return `${props.caption}. Total ${props.formatHours(totalMs.value)}. ${parts.join('. ')}.`
})
</script>

<template>
  <figure class="analytics-chart analytics-chart--share">
    <figcaption class="analytics-chart__caption">{{ caption }}</figcaption>

    <div class="analytics-share">
      <div class="analytics-share__ring" role="img" :aria-label="summary">
        <div class="analytics-share__donut" :style="{ background }"></div>
        <span class="analytics-share__total">{{ formatHours(totalMs) }}</span>
      </div>

      <ul class="analytics-share__legend">
        <li v-for="slice in slices" :key="slice.key">
          <span
            class="analytics-share__swatch"
            :style="{ background: slice.color }"
            aria-hidden="true"
          ></span>
          <span class="analytics-share__name">{{ slice.label }}</span>
          <span class="analytics-share__value">
            {{ formatShare(slice.totalMs) }}
            <em>{{ formatHours(slice.totalMs) }}</em>
          </span>
        </li>
      </ul>
    </div>

    <p v-if="isEmpty" class="analytics-chart__empty">
      Nothing tracked against a project in this period.
    </p>
  </figure>
</template>

<style scoped>
.analytics-share__ring {
  position: relative;
  width: min(168px, 100%);
  aspect-ratio: 1;
}

.analytics-share__donut {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: color-mix(in srgb, var(--line-soft, var(--line)) 50%, transparent);
  -webkit-mask: radial-gradient(closest-side, transparent 65%, #000 66%);
  mask: radial-gradient(closest-side, transparent 65%, #000 66%);
}

.analytics-share__total {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--text);
  font-size: 12px;
  font-family: inherit;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}
</style>
