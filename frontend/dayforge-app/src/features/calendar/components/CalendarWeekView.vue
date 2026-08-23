<script setup lang="ts">
import type { DailyTask, TaskTemplate } from '../../../entities/TaskEntity'
import type { ID, ISODate } from '../../../entities/types'
import {
  useCalendarWeek,
  type PositionedEvent,
} from '../composables/useCalendarWeek'
import {
  columnStyle,
  gridHeightPx,
  gridStyle,
  hourLineStyle,
  HOURS,
} from '../composables/useCalendarGrid'
import { useFormat } from '../../../composables/useFormat'

const { formatTime } = useFormat()

/** The breathing room a week column keeps on both sides. */
const WEEK_INSET_PX = 2

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
  days,
  weekLabel,
  weekSummary,
  goToPreviousWeek,
  goToNextWeek,
  goToThisWeek,
} = useCalendarWeek({
  getTemplates: () => props.templates,
  getDailyTasks: () => props.dailyTasks,
  getCurrentDate: () => props.currentDate,
})

/** A block carries its project's colours first, then its position. */
function eventStyle(event: PositionedEvent) {
  return {
    ...(event.goalId ? (props.goalVarsById[event.goalId] ?? {}) : {}),
    ...columnStyle(event.slot, WEEK_INSET_PX),
    top: `${event.topPx}px`,
    height: `${event.heightPx}px`,
  }
}
</script>

<template>
  <section class="calendar-week">
    <header class="calendar-week__header">
      <button class="btn btn-ghost" type="button" @click="goToPreviousWeek">
        ‹
      </button>
      <div class="calendar-week__title">
        <strong>{{ weekLabel }}</strong>
        <button class="btn btn-ghost" type="button" @click="goToThisWeek">
          Today
        </button>
      </div>
      <button class="btn btn-ghost" type="button" @click="goToNextWeek">
        ›
      </button>
    </header>

    <p class="calendar-week__summary">
      {{ weekSummary.done }}/{{ weekSummary.total }} done ·
      {{ weekSummary.hours }}h scheduled
    </p>

    <div class="calendar-week__wrap">
      <!-- Hour labels share the grid's geometry so rows line up across columns. -->
      <div class="calendar-week__hours">
        <div class="calendar-week__corner"></div>
        <div class="calendar-week__hour-list" :style="gridStyle(gridHeightPx)">
          <div
            v-for="hour in HOURS"
            :key="hour"
            class="calendar-week__hour-label"
            :style="hourLineStyle(hour)"
          >
            {{ String(hour).padStart(2, '0') }}:00
          </div>
        </div>
      </div>

      <div class="calendar-week__days">
        <div
          v-for="day in days"
          :key="day.date"
          class="calendar-week__day"
          :class="{
            'is-today': day.isToday,
            'is-selected': day.date === currentDate,
          }"
        >
          <button
            class="calendar-week__day-head"
            type="button"
            :title="`Open ${day.date}`"
            @click="emit('open-day', day.date)"
          >
            <span class="calendar-week__weekday">{{ day.weekdayLabel }}</span>
            <span class="calendar-week__day-number">{{ day.dayNumber }}</span>
            <span v-if="day.totalCount" class="calendar-week__day-count">
              {{ day.doneCount }}/{{ day.totalCount }}
            </span>
          </button>

          <div class="calendar-week__grid" :style="gridStyle(gridHeightPx)">
            <div
              v-for="hour in HOURS"
              :key="hour"
              class="calendar-week__hour-line"
              :style="hourLineStyle(hour)"
            ></div>

            <button
              v-for="event in day.scheduled"
              :key="event.key"
              type="button"
              class="week-event"
              :class="[
                event.priority,
                { 'is-done': event.isDone, 'is-projected': event.isProjected },
              ]"
              :style="eventStyle(event)"
              :title="`${event.startTime} ${event.title}`"
              @click="emit('open-day', day.date)"
            >
              <span class="week-event__time">{{
                formatTime(event.startTime)
              }}</span>
              <span class="week-event__title">{{ event.title }}</span>
            </button>
          </div>

          <!-- Untimed work would have nowhere to sit on the grid. -->
          <button
            v-if="day.unscheduledCount"
            class="calendar-week__unscheduled"
            type="button"
            @click="emit('open-day', day.date)"
          >
            +{{ day.unscheduledCount }} unscheduled
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
