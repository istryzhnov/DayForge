<script setup lang="ts">
import type { Goal } from '../../../entities/GoalEntity'
import { computed, ref } from 'vue'
import type { DailyTask, TaskTemplate } from '../../../entities/TaskEntity'
import type { ID } from '../../../entities/types'
import DayBarChart from './DayBarChart.vue'
import ProjectShareChart from './ProjectShareChart.vue'
import ProjectRatesDialog from './ProjectRatesDialog.vue'
import ProjectBillingDialog from './ProjectBillingDialog.vue'
import HabitMonthSection from './HabitMonthSection.vue'
import IncomeGoalCard from './IncomeGoalCard.vue'
import PlanVsActualSection from './PlanVsActualSection.vue'
import {
  PERIOD_OPTIONS,
  useTimerAnalytics,
} from '../composables/useTimerAnalytics'
import type { ProjectBilling } from '../composables/projectBilling'
import { FIXED_BASIS } from '../composables/projectBilling'

const props = defineProps<{
  goals: Goal[]
  templates: TaskTemplate[]
  dailyTasks: DailyTask[]
}>()

const emit = defineEmits<{
  (e: 'change-goal-rate', goalId: ID, hourlyRate: number | undefined): void
  (e: 'change-goal-billing', goalId: ID, billing: ProjectBilling | undefined): void
}>()

const isRatesOpen = ref(false)
const editingGoalId = ref<ID | null>(null)

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
  projectRows,
  hasAdjustments,
  projectShareLabel,
  moneyLabel,
  effectiveRateLabel,
  taskMoneyLabel,
  barWidth,
  copyReport,
} = useTimerAnalytics({
  getGoals: () => props.goals,
  getTemplates: () => props.templates,
  getDailyTasks: () => props.dailyTasks,
})

const editingGoal = computed(() =>
  props.goals.find((goal) => goal.id === editingGoalId.value),
)

const editingTrackedMs = computed(
  () =>
    projectRows.value.find((row) => row.goalId === editingGoalId.value)
      ?.trackedMs ?? 0,
)

function saveBilling(billing: ProjectBilling | undefined) {
  if (editingGoalId.value !== null) {
    emit('change-goal-billing', editingGoalId.value, billing)
  }
  editingGoalId.value = null
}
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
        <span class="analytics__card-note">
          {{ totalHoursLabel }}
          <template v-if="hasAdjustments">· includes adjustments</template>
        </span>
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
        @click="isRatesOpen = true"
      >
        <span class="analytics__card-label">Earned</span>
        <strong class="analytics__card-value">Set an hourly rate</strong>
        <span class="analytics__card-note">
          Then every row shows what it earned
        </span>
      </button>
    </div>

    <IncomeGoalCard :goals="goals" :templates="templates" />

    <p
      v-if="summary.byTask.length === 0 && projectRows.length === 0"
      class="timer-history__empty"
    >
      Nothing tracked in {{ periodLabel.toLowerCase() }} yet.
    </p>

    <template v-else>
      <div v-if="summary.byTask.length" class="analytics__charts">
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

      <template v-if="projectRows.length">
        <p class="sidebar-caption">By project</p>
        <p class="analytics__hint">
          Edit a project to add a fixed price or hours for Analytics only. Your
          time entries stay as they are.
        </p>
        <div class="analytics-table-wrap">
          <table class="analytics-table analytics-table--projects">
            <thead>
              <tr>
                <th class="analytics-table__name">Project</th>
                <th class="analytics-table__num analytics-table__tasks">Tasks</th>
                <th class="analytics-table__num">Hours</th>
                <th v-if="showsMoney" class="analytics-table__num">
                  Effective rate / h
                </th>
                <th v-if="showsMoney" class="analytics-table__num">Earned</th>
                <th class="analytics-table__action">
                  <span class="analytics-table__sr">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="project in projectRows" :key="project.key">
                <td class="analytics-table__name" :title="project.title">
                  <span class="analytics-project__title">
                    <span
                      v-if="project.color"
                      class="analytics-project__dot"
                      :style="{ background: project.color }"
                    ></span>
                    {{ project.title }}
                  </span>
                  <span
                    v-if="project.figures.fixedBasis || project.figures.manualHours"
                    class="analytics-project__badges"
                  >
                    <span
                      v-if="project.figures.fixedBasis === FIXED_BASIS.FIXED"
                      class="analytics-badge"
                    >
                      Fixed
                    </span>
                    <span
                      v-if="project.figures.fixedBasis === FIXED_BASIS.PRORATA"
                      class="analytics-badge"
                    >
                      Fixed · pro-rata
                    </span>
                    <span v-if="project.figures.manualHours" class="analytics-badge">
                      Manual hours
                    </span>
                  </span>
                </td>
                <td class="analytics-table__num analytics-table__tasks">
                  {{ project.taskCount }}
                </td>
                <td class="analytics-table__num">
                  {{ durationLabel(project.figures.ms) }}
                  <em>{{ projectShareLabel(project.figures.ms) }}</em>
                </td>
                <td v-if="showsMoney" class="analytics-table__num">
                  {{ effectiveRateLabel(project.figures.effectiveRate) }}
                </td>
                <td v-if="showsMoney" class="analytics-table__num">
                  {{ moneyLabel(project.figures.earned) }}
                </td>
                <td class="analytics-table__action">
                  <button
                    v-if="project.editable"
                    class="btn btn-ghost analytics-table__edit"
                    type="button"
                    :aria-label="`Edit figures for ${project.title}`"
                    @click="editingGoalId = project.goalId ?? null"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <PlanVsActualSection
        :period="period"
        :goals="goals"
        :templates="templates"
        :daily-tasks="dailyTasks"
        :actual="summary.byProject"
      />

      <template v-if="summary.byTask.length">
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
      </template>

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

    <HabitMonthSection
      :goals="goals"
      :templates="templates"
      :daily-tasks="dailyTasks"
    />

    <ProjectRatesDialog
      v-if="isRatesOpen"
      :goals="goals"
      @update-rate="(goalId, rate) => emit('change-goal-rate', goalId, rate)"
      @close="isRatesOpen = false"
    />

    <ProjectBillingDialog
      v-if="editingGoal"
      :goal="editingGoal"
      :tracked-ms="editingTrackedMs"
      @save="saveBilling"
      @close="editingGoalId = null"
    />
  </section>
</template>
