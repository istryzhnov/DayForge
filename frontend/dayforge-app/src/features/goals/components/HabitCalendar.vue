<script setup lang="ts">
import { computed } from 'vue'
import type { HabitDayCell } from '../../../composables/useProgressMetrics'

const props = defineProps<{
  title: string
  subtitle?: string
  cells: HabitDayCell[]
  todayPercent: number
}>()

function levelClass(percent: number) {
  if (percent <= 0) return 'lv-0'
  if (percent < 25) return 'lv-1'
  if (percent < 50) return 'lv-2'
  if (percent < 75) return 'lv-3'
  return 'lv-4'
}

const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const monthLabel = computed(() => {
  if (!props.cells.length) return ''
  const d = new Date(props.cells[0].date)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})
</script>
<template>
  <section class="habit-card">
    <header class="habit-head">
      <div>
        <h3>{{ title }}</h3>
        <p>{{ subtitle }}</p>
      </div>
      <strong>{{ todayPercent.toFixed(2) }}%</strong>
    </header>

    <div class="week-strip">
      <div
        v-for="(label, idx) in weekdayLabels"
        :key="label"
        class="week-dot-wrap"
      >
        <div
          class="week-dot"
          :class="levelClass(cells[idx]?.percent ?? 0)"
          :title="`${label}: ${cells[idx]?.percent ?? 0}%`"
        />
        <span>{{ label }}</span>
      </div>
    </div>

    <p class="month-label">{{ monthLabel }}</p>

    <div class="month-grid">
      <button
        v-for="cell in cells"
        :key="cell.date"
        class="day-cell"
        :class="[levelClass(cell.percent), { today: cell.isToday }]"
        :title="`${cell.date}: ${cell.percent}% (${cell.done}/${cell.total})`"
        type="button"
      >
        {{ new Date(cell.date).getDate() }}
      </button>
    </div>
  </section>
</template>
