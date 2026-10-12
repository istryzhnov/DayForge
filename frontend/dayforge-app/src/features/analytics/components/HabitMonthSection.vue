<script setup lang="ts">
import type { Goal } from '../../../entities/GoalEntity'
import type { DailyTask, TaskTemplate } from '../../../entities/TaskEntity'
import { getTodayISODate } from '../../../composables/goalSpace/date'
import { useHabitMonth } from '../composables/useHabitMonth'
import HabitMonthRow from './HabitMonthRow.vue'

const props = defineProps<{
  goals: Goal[]
  templates: TaskTemplate[]
  dailyTasks: DailyTask[]
}>()

const todayISO = getTodayISODate()

const {
  monthLabel,
  canGoNext,
  shiftMonth,
  view,
  hasRepeating,
  weekdayLabels,
  calendarCells,
  colorOf,
  projectNameOf,
  cellLabel,
  dayLabel,
  dayTone,
  dayNumberOf,
  percentLabel,
} = useHabitMonth({
  getGoals: () => props.goals,
  getTemplates: () => props.templates,
  getDailyTasks: () => props.dailyTasks,
})
</script>

<template>
  <section class="habits">
    <p class="sidebar-caption">Habits</p>

    <div class="habits__nav">
      <button
        class="btn btn-ghost habits__nav-button"
        type="button"
        aria-label="Previous month"
        @click="shiftMonth(-1)"
      >
        ‹
      </button>
      <strong class="habits__month">{{ monthLabel }}</strong>
      <button
        class="btn btn-ghost habits__nav-button"
        type="button"
        aria-label="Next month"
        :disabled="!canGoNext"
        @click="shiftMonth(1)"
      >
        ›
      </button>
    </div>

    <p v-if="!hasRepeating" class="timer-history__empty">
      No habits yet — make a task repeat to track it here
    </p>
    <p v-else-if="view.rows.length === 0" class="timer-history__empty">
      No habits due in {{ monthLabel }}
    </p>

    <template v-else>
      <div class="analytics__cards">
        <div class="analytics__card">
          <span class="analytics__card-label">Completion</span>
          <strong class="analytics__card-value">
            {{ percentLabel(view.completionRate) }}
          </strong>
          <span class="analytics__card-note">
            {{ view.completed }} of {{ view.expected }} due so far
          </span>
        </div>
        <div class="analytics__card">
          <span class="analytics__card-label">Full days</span>
          <strong class="analytics__card-value">{{ view.fullDays }}</strong>
          <span class="analytics__card-note">every habit done</span>
        </div>
        <div class="analytics__card">
          <span class="analytics__card-label">Streak</span>
          <strong class="analytics__card-value">
            {{ view.currentStreak }}
          </strong>
          <span class="analytics__card-note">
            {{ view.currentStreak === 1 ? 'day in a row' : 'days in a row' }}
          </span>
        </div>
      </div>

      <p class="analytics__hint">
        One square per day a habit was due. Hover or focus a square for its
        date and state.
      </p>

      <div class="habits__body">
        <ul class="habits__rows">
          <HabitMonthRow
            v-for="row in view.rows"
            :key="row.templateId"
            :row="row"
            :color="colorOf(row.goalId)"
            :project-name="projectNameOf(row.goalId)"
            :percent="percentLabel(row.completionRate)"
            :cell-label="cellLabel"
          />
        </ul>

        <figure class="analytics-chart habits__heat">
          <figcaption class="analytics-chart__caption">
            Daily completion
          </figcaption>
          <div class="habits__legend" aria-hidden="true">
            <span>Less</span>
            <i class="habits__day is-missed"></i>
            <i class="habits__day is-partial"></i>
            <i class="habits__day is-full"></i>
            <span>More</span>
          </div>
          <div class="habits__weekdays" aria-hidden="true">
            <span v-for="label in weekdayLabels" :key="label">{{ label }}</span>
          </div>
          <ol class="habits__grid">
            <li
              v-for="(day, index) in calendarCells"
              :key="day?.date ?? `blank-${index}`"
              class="habits__day"
              :class="
                day
                  ? [`is-${dayTone(day)}`, { 'is-today': day.date === todayISO }]
                  : 'is-blank'
              "
              :role="day ? 'img' : undefined"
              :aria-hidden="day ? undefined : 'true'"
              :aria-label="day ? dayLabel(day) : undefined"
              :title="day ? dayLabel(day) : undefined"
            >
              {{ day ? dayNumberOf(day.date) : '' }}
            </li>
          </ol>
        </figure>
      </div>
    </template>
  </section>
</template>
