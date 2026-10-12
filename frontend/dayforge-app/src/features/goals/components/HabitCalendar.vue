<script setup lang="ts">
import type { HabitDayCell } from '../../../composables/useProgressMetrics'
import { useHabitCalendar } from '../composables/useHabitCalendar'

const props = defineProps<{
  title: string
  subtitle?: string
  cells: HabitDayCell[]
  todayPercent: number
}>()

const {
  weekDays,
  monthDays,
  monthLabel,
  today,
  summaryParts,
  hasCells,
  isCelebrating,
  markClass,
} = useHabitCalendar(props)
</script>

<template>
  <section class="habit">
    <header class="habit__head">
      <div>
        <h3 class="habit__title">{{ title }}</h3>
        <p v-if="subtitle" class="habit__subtitle">{{ subtitle }}</p>
      </div>
      <p
        class="habit__today"
        :class="{
          'is-complete': today.isComplete,
          'is-idle': !today.isTracked,
        }"
      >
        <span class="habit__today-label">Today</span>
        <span class="habit__today-value">
          {{ today.isTracked ? `${today.done}/${today.total}` : '–' }}
        </span>
      </p>
    </header>

    <template v-if="hasCells">
      <ul class="habit__week">
        <li v-for="day in weekDays" :key="day.date" class="habit__week-day">
          <span class="habit__weekday">{{ day.label }}</span>
          <span
            class="habit__mark"
            :class="[
              markClass(day),
              { 'is-celebrating': isCelebrating(day.date) },
            ]"
            :title="day.hint"
            >{{ day.dayNumber }}</span
          >
        </li>
      </ul>

      <div class="habit__month">
        <span class="habit__month-label">{{ monthLabel }}</span>
        <div class="habit__strip">
          <span
            v-for="day in monthDays"
            :key="day.date"
            class="habit__strip-day"
            :class="markClass(day)"
            :title="day.hint"
          />
        </div>
      </div>
    </template>

    <p class="habit__summary">
      <template v-if="summaryParts.length">
        <template v-for="(part, index) in summaryParts" :key="part">
          <span v-if="index" class="habit__sep" aria-hidden="true">·</span>
          <span>{{ part }}</span>
        </template>
      </template>
      <span v-else-if="hasCells">Nothing tracked this month yet</span>
      <span v-else>No activity tracked yet</span>
    </p>
  </section>
</template>
