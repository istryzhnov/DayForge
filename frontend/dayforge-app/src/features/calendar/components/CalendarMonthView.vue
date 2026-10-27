<script setup lang="ts">
import type { ID, ISODate } from '../../../entities/types'
import type {
  MonthDayCell,
  useCalendarMonth,
} from '../composables/useCalendarMonth'
import { useFormat } from '../../../composables/useFormat'
import ProjectIcon from '../../goals/components/ProjectIcon.vue'

const { formatTime } = useFormat()

const props = defineProps<{
  /** Owned by the calendar toolbar, which drives the same month. */
  month: ReturnType<typeof useCalendarMonth>
  currentDate: ISODate
  /** Per-project colours, keyed by goal id. */
  goalVarsById: Record<ID, Record<string, string>>
  goalIconById: Record<ID, string>
}>()

const emit = defineEmits<{
  (e: 'open-day', date: ISODate): void
}>()

const { weekdayLabels, days, monthSummary } = props.month

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
    <p class="calendar-month__summary ui-oneline">
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
              {{ formatTime(event.startTime) }}
            </span>
            <ProjectIcon
              v-if="event.goalId && goalIconById[event.goalId]"
              class="calendar-month__event-icon"
              :icon="goalIconById[event.goalId]"
            />
            <span class="calendar-month__event-title">{{ event.title }}</span>
          </span>

          <span v-if="hiddenCount(day)" class="calendar-month__more">
            +{{ hiddenCount(day) }}
          </span>
        </span>
      </button>
    </div>
  </section>
</template>
