<script setup lang="ts">
import type { Goal } from '../../../entities/GoalEntity'
import type { DailyTask, TaskTemplate } from '../../../entities/TaskEntity'
import DayBarChart from './DayBarChart.vue'
import ProjectShareChart from './ProjectShareChart.vue'
import {
  PERIOD_OPTIONS,
  useTimerAnalytics,
} from '../composables/useTimerAnalytics'

const props = defineProps<{
  goals: Goal[]
  templates: TaskTemplate[]
  dailyTasks: DailyTask[]
}>()

const emit = defineEmits<{
  (e: 'open-rate-settings'): void
}>()

const {
  period,
  summary,
  showsMoney,
  rateNote,
  copied,
  habits,
  daySeries,
  seriesCaption,
  projectShares,
  periodLabel,
  totalLabel,
  totalHoursLabel,
  totalMoneyLabel,
  durationLabel,
  hoursLabel,
  shareLabel,
  percentLabel,
  projectNameOf,
  projectRateLabel,
  projectMoneyLabel,
  taskMoneyLabel,
  barWidth,
  copyReport,
} = useTimerAnalytics({
  getGoals: () => props.goals,
  getTemplates: () => props.templates,
  getDailyTasks: () => props.dailyTasks,
})
</script>

<template>
  <section class="analytics">
    <header class="analytics__head">
      <div>
        <h2 class="analytics__title">Analytics</h2>
        <p class="analytics__subtitle">
          Where your tracked hours went, and what they are worth.
        </p>
      </div>
      <button class="btn btn-ghost" type="button" @click="copyReport">
        {{ copied ? 'Copied' : 'Copy report' }}
      </button>
    </header>

    <div class="settings-chips">
      <button
        v-for="option in PERIOD_OPTIONS"
        :key="option.id"
        class="theme-chip"
        :class="{ active: period === option.id }"
        type="button"
        @click="period = option.id"
      >
        {{ option.label }}
      </button>
    </div>

    <div class="analytics__cards">
      <div class="analytics__card">
        <span class="analytics__card-label">Tracked</span>
        <strong class="analytics__card-value" :title="totalLabel">
          {{ totalLabel }}
        </strong>
        <span class="analytics__card-note">{{ totalHoursLabel }}</span>
      </div>
      <div class="analytics__card">
        <span class="analytics__card-label">Sessions</span>
        <strong class="analytics__card-value">
          {{ summary.sessionCount }}
        </strong>
        <span class="analytics__card-note">
          over {{ summary.dayCount }}
          {{ summary.dayCount === 1 ? 'day' : 'days' }}
        </span>
      </div>
      <div v-if="showsMoney" class="analytics__card analytics__card--money">
        <span class="analytics__card-label">Earned</span>
        <strong class="analytics__card-value" :title="totalMoneyLabel">
          {{ totalMoneyLabel }}
        </strong>
        <span class="analytics__card-note">{{ rateNote }}</span>
      </div>
      <button
        v-else
        class="analytics__card analytics__card--action"
        type="button"
        @click="emit('open-rate-settings')"
      >
        <span class="analytics__card-label">Earned</span>
        <strong class="analytics__card-value">Set an hourly rate</strong>
        <span class="analytics__card-note">
          Then every row shows what it earned
        </span>
      </button>
    </div>

    <p v-if="summary.byTask.length === 0" class="timer-history__empty">
      Nothing tracked in {{ periodLabel.toLowerCase() }} yet.
    </p>

    <template v-else>
      <div class="analytics__charts">
        <DayBarChart
          :points="daySeries.points"
          :caption="seriesCaption"
          :format-hours="hoursLabel"
        />
        <ProjectShareChart
          :shares="projectShares"
          caption="Share of time by project"
          :format-hours="hoursLabel"
          :format-share="shareLabel"
        />
      </div>

      <p class="sidebar-caption">By project</p>
      <div class="analytics-table-wrap">
        <table class="analytics-table">
          <thead>
            <tr>
              <th class="analytics-table__name">Project</th>
              <th class="analytics-table__num">Tasks</th>
              <th class="analytics-table__num">Hours</th>
              <th v-if="showsMoney" class="analytics-table__num">Rate / h</th>
              <th v-if="showsMoney" class="analytics-table__num">Earned</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="project in summary.byProject" :key="project.title">
              <td class="analytics-table__name" :title="project.title">
                {{ project.title }}
              </td>
              <td class="analytics-table__num">{{ project.taskCount }}</td>
              <td class="analytics-table__num">
                {{ durationLabel(project.totalMs) }}
                <em>{{ shareLabel(project.totalMs) }}</em>
              </td>
              <td v-if="showsMoney" class="analytics-table__num">
                {{ projectRateLabel(project) }}
              </td>
              <td v-if="showsMoney" class="analytics-table__num">
                {{ projectMoneyLabel(project) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="sidebar-caption">By task</p>
      <div class="analytics__tasks">
        <div v-for="task in summary.byTask" :key="task.key" class="time-total">
          <div class="time-total__row">
            <span class="time-total__title">{{ task.title }}</span>
            <span class="time-total__value">
              {{ hoursLabel(task.totalMs) }}
              <em v-if="showsMoney">{{ taskMoneyLabel(task) }}</em>
              <em v-else>{{ shareLabel(task.totalMs) }}</em>
            </span>
          </div>
          <div class="time-total__bar">
            <span :style="{ width: barWidth(task.totalMs) }"></span>
          </div>
          <span class="time-total__sessions">
            {{ task.sessionCount }}
            {{ task.sessionCount === 1 ? 'session' : 'sessions' }}
          </span>
        </div>
      </div>

      <template v-if="habits.length">
        <p class="sidebar-caption">Repeating tasks</p>
        <p class="analytics__hint">
          Days this period asked for the task, and how many of them you ticked
          off. A streak counts back from the last day it was due.
        </p>
        <div class="analytics-table-wrap">
          <table class="analytics-table">
            <thead>
              <tr>
                <th class="analytics-table__name">Task</th>
                <th class="analytics-table__sub">Project</th>
                <th class="analytics-table__num">Done</th>
                <th class="analytics-table__num">Of</th>
                <th class="analytics-table__num">Streak</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="habit in habits" :key="habit.templateId">
                <td class="analytics-table__name" :title="habit.title">
                  {{ habit.title }}
                </td>
                <td
                  class="analytics-table__sub analytics-table__muted"
                  :title="projectNameOf(habit.goalId)"
                >
                  {{ projectNameOf(habit.goalId) }}
                </td>
                <td class="analytics-table__num">
                  {{ habit.completed }}
                  <em>{{ percentLabel(habit.completionRate) }}</em>
                </td>
                <td class="analytics-table__num">{{ habit.expected }}</td>
                <td class="analytics-table__num">
                  {{ habit.currentStreak }}
                  <em>best {{ habit.longestStreak }}</em>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </template>
  </section>
</template>
