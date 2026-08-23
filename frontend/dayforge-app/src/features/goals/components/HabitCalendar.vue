<script setup lang="ts">
import type { HabitDayCell } from '../../../composables/useProgressMetrics'
import { useHabitCalendar } from '../composables/useHabitCalendar'

const props = defineProps<{
  title: string
  subtitle?: string
  cells: HabitDayCell[]
  todayPercent: number
}>()

const { weekCells, levelClass, progressState, progressStyle } =
  useHabitCalendar(props)
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
        :key="cell.date"
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
  </section>
</template>
