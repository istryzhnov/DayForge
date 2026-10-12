<script setup lang="ts">
import type { SeriesPoint } from '../../../composables/analytics/charts'
import { useBarChartGeometry } from '../composables/useChartGeometry'

const props = defineProps<{
  points: SeriesPoint[]
  caption: string
  formatHours: (totalMs: number) => string
}>()

const { chart } = useBarChartGeometry(() => props.points)
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

        <g class="analytics-chart__bars">
          <rect
            v-for="bar in chart.bars"
            :key="bar.point.date"
            :x="bar.x"
            :y="bar.y"
            :width="bar.width"
            :height="bar.height"
            rx="2"
          >
            <title>
              {{ bar.point.title }} · {{ formatHours(bar.point.totalMs) }}
            </title>
          </rect>
        </g>
      </svg>
    </div>

    <p v-if="chart.isEmpty" class="analytics-chart__empty">
      No tracked time on any day of this period.
    </p>
  </figure>
</template>
