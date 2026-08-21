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
  const [year, month] = props.cells[0].date.split('-').map(Number)
  const d = new Date(year, month - 1, 1)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

function parseISODate(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toLocalISODate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const cellsByDate = computed(
  () => new Map(props.cells.map((cell) => [cell.date, cell])),
)

const weekCells = computed(() => {
  if (!props.cells.length) return []

  const todayCell =
    props.cells.find((cell) => cell.isToday) ??
    props.cells[props.cells.length - 1]
  const todayDate = parseISODate(todayCell.date)
  const mondayIndex = (todayDate.getDay() + 6) % 7
  const weekStart = new Date(todayDate)
  weekStart.setDate(todayDate.getDate() - mondayIndex)

  return weekdayLabels.map((label, offset) => {
    const nextDate = new Date(weekStart)
    nextDate.setDate(weekStart.getDate() + offset)
    const isoDate = toLocalISODate(nextDate)
    const cell = cellsByDate.value.get(isoDate)

    return {
      label,
      percent: cell?.percent ?? 0,
      done: cell?.done ?? 0,
      total: cell?.total ?? 0,
      isToday: cell?.isToday ?? false,
      date: isoDate,
    }
  })
})

function dayNumber(dateISO: string) {
  return Number(dateISO.split('-')[2])
}

function progressState(percent: number) {
  if (percent <= 0) return 'is-empty'
  if (percent < 35) return 'is-low'
  if (percent < 70) return 'is-medium'
  if (percent < 100) return 'is-high'
  return 'is-complete'
}

function progressStyle(percent: number) {
  const clamped = Math.max(0, Math.min(100, percent))
  return {
    '--progress': `${clamped}%`,
  }
}
</script>
<template>
  <section class="habit-calendar">
    <header class="habit-calendar__head">
      <div>
        <h3 class="habit-calendar__title">{{ title }}</h3>
        <p class="habit-calendar__subtitle">{{ subtitle }}</p>
      </div>
      <strong class="habit-calendar__value"
        >{{ todayPercent.toFixed(2) }}%</strong
      >
    </header>

    <div class="habit-calendar__week">
      <div
        v-for="cell in weekCells"
        :key="cell.label"
        class="habit-calendar__week-item"
      >
        <div
          class="habit-calendar__circle habit-calendar__circle--week"
          :class="[
            levelClass(cell.percent),
            progressState(cell.percent),
            { 'is-today': cell.isToday },
          ]"
          :style="progressStyle(cell.percent)"
          :title="`${cell.label}: ${cell.percent}% (${cell.done}/${cell.total})`"
        >
          <span v-if="cell.percent >= 100" class="habit-calendar__check"
            >✓</span
          >
          <span v-else class="habit-calendar__circle-value"
            >{{ Math.round(cell.percent) }}%</span
          >
        </div>
        <span class="habit-calendar__weekday">{{ cell.label }}</span>
      </div>
    </div>
    <!--
    <p class="habit-calendar__month">{{ monthLabel }}</p>

    <div class="habit-calendar__month-grid">
      <button
        v-for="cell in cells"
        :key="cell.date"
        class="habit-calendar__day"
        :class="[
          levelClass(cell.percent),
          progressState(cell.percent),
          { 'is-today': cell.isToday },
        ]"
        :style="progressStyle(cell.percent)"
        :title="`${cell.date}: ${cell.percent}% (${cell.done}/${cell.total})`"
        type="button"
      >
        <span class="habit-calendar__day-number">{{
          dayNumber(cell.date)
        }}</span>
      </button>
    </div>
    -->
  </section>
</template>
