<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Goal } from '../../../entities/GoalEntity'
import type { ID, ISODate } from '../../../entities/types'
import type {
  MonthDayCell,
  MonthEvent,
  useCalendarMonth,
} from '../composables/useCalendarMonth'
import { useFormat } from '../../../shared/composables/useFormat'
import {
  capitalizeFirst,
  panelDateLabel,
} from '../../../shared/composables/panelDateLabel'

const { formatTime } = useFormat()

const props = defineProps<{
  /** Owned by the calendar toolbar, which drives the same month. */
  month: ReturnType<typeof useCalendarMonth>
  currentDate: ISODate
  /** Per-project colours, keyed by goal id. */
  goalVarsById: Record<ID, Record<string, string>>
  goals: Goal[]
  /** Formatted earnings for a day, or `null` when there's nothing to show. */
  earnedLabel?: (date: ISODate) => string | null
}>()

const emit = defineEmits<{
  (e: 'open-day', date: ISODate): void
}>()

const { weekdayLabels, days, monthSummary } = props.month

const { t } = useI18n()

/** The day the details panel shows; today (the current date) until a cell is picked. */
const pickedDate = ref<ISODate | null>(null)
const selectedDate = computed<ISODate>(
  () => pickedDate.value ?? props.currentDate,
)

const selectedEvents = computed<MonthEvent[]>(() =>
  props.month.eventsOn(selectedDate.value),
)

const selectedHeading = computed(() =>
  capitalizeFirst(
    panelDateLabel(selectedDate.value, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
  ),
)

function shortDate(date: ISODate): string {
  return panelDateLabel(date, { day: 'numeric', month: 'long' })
}

function goalName(goalId: ID | undefined): string {
  if (!goalId) return t('calendar.noProject')
  return (
    props.goals.find((goal) => goal.id === goalId)?.title ??
    t('calendar.noProject')
  )
}

/** "09:00–10:30", or just the start when no end is set, or nothing when untimed. */
function eventTime(event: MonthEvent): string {
  if (!event.startTime) return ''
  if (!event.endTime) return formatTime(event.startTime)
  return `${formatTime(event.startTime)}–${formatTime(event.endTime)}`
}

function scheduleText(key: string, tasks: number, hours: number): string {
  return t(key, {
    tasks: t('calendar.taskCount', tasks),
    hours,
    unit: t('timer.unitHour'),
  })
}

/** Only a few fit in a cell; the rest collapse into a "+N" hint. */
const VISIBLE_EVENTS = 3

function visibleEvents(day: MonthDayCell) {
  return day.events.slice(0, VISIBLE_EVENTS)
}

function hiddenCount(day: MonthDayCell) {
  return Math.max(0, day.events.length - VISIBLE_EVENTS)
}

function pickDay(date: ISODate) {
  pickedDate.value = date
}
</script>

<template>
  <section class="calendar-month">
    <p class="calendar-month__summary">
      {{
        scheduleText(
          'calendar.monthSummary',
          monthSummary.tasks,
          monthSummary.hours,
        )
      }}
      <template v-if="monthSummary.busiestDay?.scheduledMinutes">
        ·
        {{
          t('calendar.busiestDay', {
            date: shortDate(monthSummary.busiestDay.date),
          })
        }}
      </template>
    </p>

    <div class="calendar-month__body">
      <div class="calendar-month__main">
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
                'is-selected': day.date === selectedDate,
              },
            ]"
            :aria-pressed="day.date === selectedDate"
            :title="
              scheduleText(
                'calendar.dayCell',
                day.totalCount,
                Math.round(day.scheduledMinutes / 60),
              )
            "
            @click="pickDay(day.date)"
          >
            <span class="calendar-month__day-head">
              <span class="calendar-month__day-number">{{
                day.dayNumber
              }}</span>
              <span v-if="day.totalCount" class="calendar-month__day-count">
                {{ day.doneCount }}/{{ day.totalCount }}
              </span>
            </span>
            <span
              v-if="earnedLabel?.(day.date)"
              class="calendar-day-money calendar-month__day-money"
            >
              +{{ earnedLabel(day.date) }}
            </span>

            <span class="calendar-month__events">
              <span
                v-for="event in visibleEvents(day)"
                :key="event.key"
                class="calendar-month__event"
                :style="event.goalId ? goalVarsById[event.goalId] : undefined"
                :class="[
                  {
                    'is-done': event.isDone,
                    'is-projected': event.isProjected,
                  },
                ]"
              >
                <span v-if="event.startTime" class="calendar-month__event-time">
                  {{ formatTime(event.startTime) }}
                </span>
                <span class="calendar-month__event-title">{{
                  event.title
                }}</span>
              </span>

              <span v-if="hiddenCount(day)" class="calendar-month__more">
                +{{ hiddenCount(day) }}
              </span>
            </span>
          </button>
        </div>
      </div>

      <section
        class="calendar-month__panel"
        aria-labelledby="calendar-month-panel-title"
      >
        <h2 id="calendar-month-panel-title" class="calendar-month__panel-title">
          {{ selectedHeading }}
        </h2>

        <ul v-if="selectedEvents.length" class="calendar-month__panel-list">
          <li
            v-for="event in selectedEvents"
            :key="event.key"
            class="calendar-month__panel-event"
            :class="{ 'is-done': event.isDone }"
            :style="event.goalId ? goalVarsById[event.goalId] : undefined"
          >
            <span class="calendar-month__panel-event-title">{{
              event.title
            }}</span>
            <span class="calendar-month__panel-event-meta">
              <template v-if="eventTime(event)"
                >{{ eventTime(event) }} · </template
              >{{ goalName(event.goalId) }}
            </span>
          </li>
        </ul>
        <p v-else class="calendar-month__panel-empty">
          {{ t('tasks.nothingPlanned') }}
        </p>

        <button
          type="button"
          class="calendar-month__open-day"
          @click="emit('open-day', selectedDate)"
        >
          {{ t('calendar.openDay', { date: shortDate(selectedDate) }) }}
        </button>
      </section>
    </div>
  </section>
</template>
