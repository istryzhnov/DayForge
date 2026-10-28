<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppIcon from '../../../components/AppIcon.vue'
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

const { t } = useI18n()
const todayISO = getTodayISODate()

const {
  monthLabel,
  canGoNext,
  shiftMonth,
  view,
  hasRepeating,
  streakOf,
  stripCellsOf,
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
    <div class="habits__main">
      <p v-if="!hasRepeating" class="timer-history__empty">
        {{ t('analytics.habitsEmpty') }}
      </p>
      <p v-else-if="view.rows.length === 0" class="timer-history__empty">
        {{ t('analytics.habitsNone', { month: monthLabel }) }}
      </p>
      <div v-else class="ui-card habits__card">
        <ul class="habits__rows">
          <HabitMonthRow
            v-for="row in view.rows"
            :key="row.templateId"
            :row="row"
            :cells="stripCellsOf(row)"
            :color="colorOf(row.goalId)"
            :project-name="projectNameOf(row.goalId)"
            :streak="streakOf(row.templateId)"
            :cell-label="cellLabel"
          />
        </ul>
      </div>
    </div>

    <div class="habits__side">
      <div class="habits__nav">
        <button
          class="ui-icon-btn ui-icon-btn--outlined"
          type="button"
          :aria-label="t('analytics.prevMonth')"
          @click="shiftMonth(-1)"
        >
          <AppIcon name="chevron-left" :size="18" />
        </button>
        <strong class="habits__month">{{ monthLabel }}</strong>
        <button
          class="ui-icon-btn ui-icon-btn--outlined"
          type="button"
          :aria-label="t('analytics.nextMonth')"
          :disabled="!canGoNext"
          @click="shiftMonth(1)"
        >
          <AppIcon name="chevron-right" :size="18" />
        </button>
      </div>

      <template v-if="view.rows.length > 0">
        <figure class="ui-card habits__calendar">
          <figcaption class="ui-section-label">
            {{ t('analytics.dailyCompletion') }}
          </figcaption>
          <div class="habits__weekdays" aria-hidden="true">
            <span v-for="(label, index) in weekdayLabels" :key="index">{{
              label
            }}</span>
          </div>
          <ol class="habits__grid">
            <li
              v-for="(day, index) in calendarCells"
              :key="day?.date ?? `blank-${index}`"
              class="habits__day"
              :class="
                day
                  ? [
                      `is-${dayTone(day)}`,
                      { 'is-today': day.date === todayISO },
                    ]
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
          <div class="habits__legend" aria-hidden="true">
            <span>{{ t('analytics.less') }}</span>
            <i class="habits__day is-missed"></i>
            <i class="habits__day is-partial"></i>
            <i class="habits__day is-full"></i>
            <span>{{ t('analytics.more') }}</span>
          </div>
        </figure>

        <div class="habits__stats">
          <div class="ui-stat">
            <span class="ui-stat__label">{{ t('analytics.completion') }}</span>
            <strong class="ui-stat__value">{{
              percentLabel(view.completionRate)
            }}</strong>
            <span class="habits__note"
              >{{ view.completed }} / {{ view.expected }}</span
            >
          </div>
          <div class="ui-stat">
            <span class="ui-stat__label">{{ t('analytics.fullDays') }}</span>
            <strong class="ui-stat__value">{{ view.fullDays }}</strong>
          </div>
          <div class="ui-stat">
            <span class="ui-stat__label">{{ t('analytics.colStreak') }}</span>
            <strong class="ui-stat__value">{{ view.currentStreak }}</strong>
            <span class="habits__note">
              {{ t('analytics.dayInRow', view.currentStreak) }}
            </span>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>
