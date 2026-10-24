<script setup lang="ts">
import type { Goal } from '../../../entities/GoalEntity'
import { computed, defineAsyncComponent, ref } from 'vue'
import type { DailyTask, TaskTemplate } from '../../../entities/TaskEntity'
import type { PaymentStatus } from '../../../entities/BillingEntity'
import type { ID } from '../../../entities/types'
import { useSettings } from '../../../composables/useSettings'
import { useAuth } from '../../../composables/useAuth'
import DayBarChart from './DayBarChart.vue'
import ProjectShareChart from './ProjectShareChart.vue'
import ProjectRatesDialog from './ProjectRatesDialog.vue'
import ProjectBillingDialog from './ProjectBillingDialog.vue'
import HabitMonthSection from './HabitMonthSection.vue'
import IncomeGoalCard from './IncomeGoalCard.vue'
import PlanVsActualSection from './PlanVsActualSection.vue'
import ClientSummaryTable from './ClientSummaryTable.vue'
import {
  PERIOD_OPTIONS,
  useTimerAnalytics,
} from '../composables/useTimerAnalytics'
import type { ProjectBilling } from '../composables/projectBilling'
import { FIXED_BASIS } from '../composables/projectBilling'
import {
  ALL_CLIENTS_FILTER_ID,
  NO_CLIENT_FILTER_ID,
} from '../composables/clientBilling'
import { useClientPayments } from '../composables/useClientPayments'

/** The export code is only fetched when someone opens the dialog. */
const BillingExportDialog = defineAsyncComponent(
  () => import('./BillingExportDialog.vue'),
)

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
  clientFilter,
  clientLabel,
  clientRows,
  billingMonth,
  outstanding,
  filteredTemplates,
  periodEntries,
  periodBounds,
  rateOf,
  currency,
} = useTimerAnalytics({
  getGoals: () => props.goals,
  getTemplates: () => props.templates,
  getDailyTasks: () => props.dailyTasks,
})

const { settings } = useSettings()
const { setStatus, setAmount } = useClientPayments()
const { user } = useAuth()

const isExportOpen = ref(false)

const hasClients = computed(() => settings.billing.clients.length > 0)

/** Archived clients stay in the filter so their history can still be seen. */
const clientChoices = computed(() =>
  settings.billing.clients.map((client) => ({
    id: client.id,
    label: client.archived ? `${client.name} (archived)` : client.name,
  })),
)

function formatMoney(value: number): string {
  return new Intl.NumberFormat(settings.format.locale, {
    style: 'currency',
    currency: currency.value,
    maximumFractionDigits: 2,
  }).format(value)
}

function handleSetStatus(
  clientId: ID,
  status: PaymentStatus,
  amount: number,
) {
  setStatus(clientId, billingMonth.value, status, amount)
}

function handleSetAmount(clientId: ID, amount: number | undefined) {
  setAmount(clientId, billingMonth.value, amount)
}

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
      <div class="analytics__actions">
        <button class="btn btn-ghost" type="button" @click="copyReport">
          {{ copied ? 'Copied' : 'Copy report' }}
        </button>
        <button
          class="btn btn-ghost"
          type="button"
          :disabled="periodEntries.length === 0"
          @click="isExportOpen = true"
        >
          Export
        </button>
      </div>
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

    <div v-if="hasClients" class="settings-chips analytics__clients">
      <button
        class="theme-chip"
        :class="{ active: clientFilter === ALL_CLIENTS_FILTER_ID }"
        type="button"
        @click="clientFilter = ALL_CLIENTS_FILTER_ID"
      >
        All clients
      </button>
      <button
        v-for="choice in clientChoices"
        :key="choice.id"
        class="theme-chip"
        :class="{ active: clientFilter === choice.id }"
        type="button"
        @click="clientFilter = choice.id"
      >
        {{ choice.label }}
      </button>
      <button
        class="theme-chip"
        :class="{ active: clientFilter === NO_CLIENT_FILTER_ID }"
        type="button"
        @click="clientFilter = NO_CLIENT_FILTER_ID"
      >
        No client
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
      <div
        v-if="hasClients"
        class="analytics__card analytics__card--money"
        data-testid="outstanding-card"
      >
        <span class="analytics__card-label">Outstanding</span>
        <strong class="analytics__card-value" :title="formatMoney(outstanding.total)">
          {{ formatMoney(outstanding.total) }}
        </strong>
        <span class="analytics__card-note">
          {{ outstanding.count }} invoiced, unpaid
          <template v-if="outstanding.overdueCount > 0">
            · {{ outstanding.overdueCount }} overdue (30+ days)
          </template>
          <template v-if="outstanding.withoutAmountCount > 0">
            · {{ outstanding.withoutAmountCount }} without an amount
          </template>
        </span>
      </div>
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

      <template v-if="hasClients && clientRows.length">
        <p class="sidebar-caption">By client</p>
        <p class="analytics__hint">
          Status is kept per client for {{ billingMonth }}, the month this
          period ends in. Invoiced amounts count towards Outstanding until they
          are marked paid.
        </p>
        <ClientSummaryTable
          :rows="clientRows"
          :payments="settings.billing.payments"
          :month="billingMonth"
          :locale="settings.format.locale"
          :money="formatMoney"
          :hours="hoursLabel"
          @set-status="handleSetStatus"
          @set-amount="handleSetAmount"
        />
      </template>

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
      :templates="filteredTemplates"
      :daily-tasks="dailyTasks"
    />

    <BillingExportDialog
      v-if="isExportOpen"
      :entries="periodEntries"
      :goals="goals"
      :clients="settings.billing.clients"
      :rate-of="rateOf"
      :currency="currency"
      :locale="settings.format.locale"
      :from="periodBounds.from"
      :to="periodBounds.to"
      :period-label="periodLabel"
      :client-label="clientLabel"
      :author-name="user?.name ?? undefined"
      @close="isExportOpen = false"
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
