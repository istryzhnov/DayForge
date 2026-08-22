<script setup lang="ts">
import type { DailyTask, TaskTemplate } from '../../../entities/TaskEntity'
import type { ID, ISODate } from '../../../entities/types'
import {
  useCalendarMonth,
  type MonthDayCell,
} from '../composables/useCalendarMonth'

const props = defineProps<{
  templates: TaskTemplate[]
  dailyTasks: DailyTask[]
  currentDate: ISODate
  /** Per-project colours, keyed by goal id. */
  goalVarsById: Record<ID, Record<string, string>>
}>()

const emit = defineEmits<{
  (e: 'open-day', date: ISODate): void
}>()

const {
  monthLabel,
  weekdayLabels,
  days,
  monthSummary,
  goToPreviousMonth,
  goToNextMonth,
  goToTodayMonth,
} = useCalendarMonth({
  getTemplates: () => props.templates,
  getDailyTasks: () => props.dailyTasks,
  getCurrentDate: () => props.currentDate,
})

/** Only a few fit in a cell; the rest collapse into a "+N" hint. */
const VISIBLE_EVENTS = 3

function visibleEvents(day: MonthDayCell) {
  return day.events.slice(0, VISIBLE_EVENTS)
}

function hiddenCount(day: MonthDayCell) {
  return Math.max(0, day.events.length - VISIBLE_EVENTS)
}
</script>

<template>
  <section class="calendar-month">
    <header class="calendar-month__header">
      <button class="btn btn-ghost" type="button" @click="goToPreviousMonth">
        ‹
      </button>
      <div class="calendar-month__title">
        <strong>{{ monthLabel }}</strong>
        <button class="btn btn-ghost" type="button" @click="goToTodayMonth">
          Today
        </button>
      </div>
      <button class="btn btn-ghost" type="button" @click="goToNextMonth">
        ›
      </button>
    </header>

    <p class="calendar-month__summary">
      {{ monthSummary.tasks }} tasks · {{ monthSummary.hours }}h scheduled
      <template v-if="monthSummary.busiestDay?.scheduledMinutes">
        · busiest {{ monthSummary.busiestDay.date }}
      </template>
    </p>

    <div class="calendar-month__weekdays">
      <span v-for="label in weekdayLabels" :key="label">{{ label }}</span>
    </div>

    <div class="calendar-month__grid">
      <button
        v-for="day in days"
        :key="day.date"
        type="button"
        class="calendar-month__day"
        :class="[
          `load-${day.loadLevel}`,
          {
            'is-today': day.isToday,
            'is-outside': !day.isCurrentMonth,
            'is-selected': day.date === currentDate,
          },
        ]"
        :title="`${day.totalCount} tasks · ${Math.round(day.scheduledMinutes / 60)}h`"
        @click="emit('open-day', day.date)"
      >
        <span class="calendar-month__day-head">
          <span class="calendar-month__day-number">{{ day.dayNumber }}</span>
          <span v-if="day.totalCount" class="calendar-month__day-count">
            {{ day.doneCount }}/{{ day.totalCount }}
          </span>
        </span>

        <span class="calendar-month__events">
          <span
            v-for="event in visibleEvents(day)"
            :key="event.key"
            class="calendar-month__event"
            :style="event.goalId ? goalVarsById[event.goalId] : undefined"
            :class="[
              event.priority,
              { 'is-done': event.isDone, 'is-projected': event.isProjected },
            ]"
          >
            <span v-if="event.startTime" class="calendar-month__event-time">
              {{ event.startTime }}
            </span>
            {{ event.title }}
          </span>

          <span v-if="hiddenCount(day)" class="calendar-month__more">
            +{{ hiddenCount(day) }}
          </span>
        </span>
      </button>
    </div>
  </section>
</template>
