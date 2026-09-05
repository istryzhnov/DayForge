<script setup lang="ts">
import type { ShareInput } from '../../../composables/analytics/charts'
import { useDonutGeometry } from '../composables/useChartGeometry'

const props = defineProps<{
  shares: ShareInput[]
  caption: string
  formatHours: (totalMs: number) => string
  formatShare: (totalMs: number) => string
}>()

const { donut, tintOf } = useDonutGeometry(() => props.shares)
</script>

<template>
  <figure class="analytics-chart analytics-chart--share">
    <figcaption class="analytics-chart__caption">{{ caption }}</figcaption>

    <div class="analytics-share">
      <!-- The measured box carries no padding of its own. -->
      <div ref="chartBox" class="analytics-share__ring">
        <svg
          class="analytics-chart__svg"
          :width="donut.size"
          :height="donut.size"
          :viewBox="`0 0 ${donut.size} ${donut.size}`"
          role="img"
          :aria-label="caption"
        >
          <circle
            class="analytics-share__track"
            :cx="donut.cx"
            :cy="donut.cy"
            :r="donut.size / 2 - donut.thickness / 2 - 1"
            :stroke-width="donut.thickness"
          />
          <path
            v-for="segment in donut.segments"
            :key="segment.key"
            class="analytics-share__slice"
            :d="segment.path"
            :fill-opacity="tintOf(segment.rank)"
          >
            <title>
              {{ segment.label }} · {{ formatShare(segment.totalMs) }}
            </title>
          </path>
          <text
            class="analytics-share__total"
            :x="donut.cx"
            :y="donut.cy + 4"
            text-anchor="middle"
          >
            {{ formatHours(donut.totalMs) }}
          </text>
        </svg>
      </div>

      <ul class="analytics-share__legend">
        <li v-for="segment in donut.segments" :key="segment.key">
          <span
            class="analytics-share__swatch"
            :style="{ opacity: tintOf(segment.rank) }"
            aria-hidden="true"
          ></span>
          <span class="analytics-share__name">{{ segment.label }}</span>
          <span class="analytics-share__value">
            {{ formatShare(segment.totalMs) }}
            <em>{{ formatHours(segment.totalMs) }}</em>
          </span>
        </li>
      </ul>
    </div>

    <p v-if="donut.isEmpty" class="analytics-chart__empty">
      Nothing tracked against a project in this period.
    </p>
  </figure>
</template>
