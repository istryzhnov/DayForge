<script setup lang="ts">
import type { ISODate } from '../../../entities/types'
import { computed, useId } from 'vue'
import { buildWave, type Bar, type SeriesPoint } from '../composables/charts'
import { useBarChartGeometry } from '../composables/useChartGeometry'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  points: SeriesPoint[]
  caption: string
  formatHours: (totalMs: number) => string
  /** The bucket holding today: a day, or the week it falls in. */
  todayKey: ISODate
}>()

const { chart } = useBarChartGeometry(() => props.points)

/** Each SVG needs its own gradient id: two charts can share a page. */
const gradientId = `wave-${useId()}`

/**
 * The time drawn as a smooth wave through the top of each bucket. It stops at
 * today: days still ahead have no time yet, so the line doesn't fall to zero
 * in front of them.
 */
const wave = computed(() =>
  buildWave(
    chart.value.bars
      .filter((bar) => bar.point.date <= props.todayKey)
      .map((bar) => ({ x: bar.x + bar.width / 2, y: bar.y })),
    chart.value.baseline,
  ),
)

/** Every bucket keeps a full-height hover strip carrying its exact time. */
function hitX(bar: Bar): number {
  const slot = chart.value.bars[1]
    ? chart.value.bars[1].x - chart.value.bars[0].x
    : bar.width
  return bar.x + bar.width / 2 - slot / 2
}

function hitWidth(): number {
  const bars = chart.value.bars
  return bars[1] ? bars[1].x - bars[0].x : (bars[0]?.width ?? 0)
}
</script>

<template>
  <figure class="analytics-chart">
    <figcaption class="analytics-chart__caption">{{ caption }}</figcaption>

    <!-- The measured box carries no padding of its own. -->
    <div ref="chartBox" class="analytics-chart__box">
      <svg
        class="analytics-chart__svg"
        :width="chart.width"
        :height="chart.height"
        :viewBox="`0 0 ${chart.width} ${chart.height}`"
        role="img"
        :aria-label="caption"
      >
        <g class="analytics-chart__grid">
          <line
            v-for="(line, index) in chart.gridLines"
            :key="`grid-${index}`"
            :x1="chart.axis.gridFrom"
            :x2="chart.width"
            :y1="line.y"
            :y2="line.y"
          />
        </g>

        <g class="analytics-chart__axis">
          <text
            v-for="(line, index) in chart.gridLines"
            :key="`unit-${index}`"
            :x="chart.axis.labelX"
            :y="line.y + 3"
            text-anchor="end"
          >
            {{ line.label }}
          </text>
          <text
            v-for="tick in chart.ticks"
            :key="`tick-${tick.x}`"
            :x="tick.x"
            :y="chart.axis.tickY"
            text-anchor="middle"
          >
            {{ tick.label }}
          </text>
        </g>

        <defs>
          <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" class="analytics-wave__stop-top" />
            <stop offset="100%" class="analytics-wave__stop-bottom" />
          </linearGradient>
        </defs>

        <g v-if="wave.end && !chart.isEmpty" class="analytics-wave">
          <path
            class="analytics-wave__area"
            :d="wave.area"
            :fill="`url(#${gradientId})`"
          />
          <path class="analytics-wave__line" :d="wave.line" />
          <line
            class="analytics-wave__guide"
            :x1="wave.end.x"
            :x2="wave.end.x"
            :y1="wave.end.y + 8"
            :y2="chart.baseline"
          />
          <circle
            class="analytics-wave__halo"
            :cx="wave.end.x"
            :cy="wave.end.y"
            r="9"
          />
          <circle
            class="analytics-wave__dot"
            :cx="wave.end.x"
            :cy="wave.end.y"
            r="4.5"
          />
        </g>

        <g class="analytics-chart__hits">
          <rect
            v-for="bar in chart.bars"
            :key="bar.point.date"
            :x="hitX(bar)"
            :y="0"
            :width="hitWidth()"
            :height="chart.baseline"
          >
            <title>
              {{ bar.point.title }} · {{ formatHours(bar.point.totalMs) }}
            </title>
          </rect>
        </g>
      </svg>
    </div>

    <p v-if="chart.isEmpty" class="analytics-chart__empty">
      {{ t('analytics.chartEmpty') }}
    </p>
  </figure>
</template>
