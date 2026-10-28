<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ISODate, ID } from '../../../entities/types'
import type {
  PositionedEvent,
  useCalendarWeek,
} from '../composables/useCalendarWeek'
import {
  columnStyle,
  gridHeightPx,
  gridStyle,
  hourLineStyle,
  HOURS,
} from '../composables/useCalendarGrid'
import { useFormat } from '../../../composables/useFormat'
import { useCalendarNow } from '../composables/useCalendarNow'
import ProjectIcon from '../../goals/components/ProjectIcon.vue'

const { formatTime } = useFormat()

/** The breathing room a week column keeps on both sides. */
const WEEK_INSET_PX = 2
const WEEK_ICON_MIN_HEIGHT_PX = 24

const props = defineProps<{
  /** Owned by the calendar toolbar, which drives the same week. */
  week: ReturnType<typeof useCalendarWeek>
  currentDate: ISODate
  /** Per-project colours, keyed by goal id. */
  goalVarsById: Record<ID, Record<string, string>>
  goalIconById: Record<ID, string>
}>()

const emit = defineEmits<{
  (e: 'open-day', date: ISODate): void
}>()

const { days, weekSummary } = props.week

const { t } = useI18n()

const { nowTopPx } = useCalendarNow(() => props.currentDate)

function iconFor(goalId: ID | undefined) {
  return goalId ? props.goalIconById[goalId] : undefined
}

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
    <p class="calendar-week__summary">
      {{
        t('calendar.weekSummary', {
          done: weekSummary.done,
          total: weekSummary.total,
          hours: weekSummary.hours,
          unit: t('timer.unitHour'),
        })
      }}
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
            :title="t('calendar.openDay', { date: day.date })"
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

            <template v-if="day.isToday">
              <div
                class="cal-past-shade"
                :style="{ height: `${nowTopPx}px` }"
              ></div>
              <div class="cal-now-line" :style="{ top: `${nowTopPx}px` }"></div>
            </template>

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
              <span class="week-event__title">
                <ProjectIcon
                  v-if="
                    iconFor(event.goalId) &&
                    event.heightPx >= WEEK_ICON_MIN_HEIGHT_PX
                  "
                  class="week-event__icon"
                  :icon="iconFor(event.goalId)"
                />{{ event.title }}
              </span>
            </button>
          </div>

          <!-- Untimed work would have nowhere to sit on the grid. -->
          <button
            v-if="day.unscheduledCount"
            class="calendar-week__unscheduled"
            type="button"
            @click="emit('open-day', day.date)"
          >
            {{ t('calendar.moreUnscheduled', { n: day.unscheduledCount }) }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
