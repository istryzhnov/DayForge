<script setup lang="ts">
import type { Goal } from '../../../entities/GoalEntity'
import { computed, defineAsyncComponent, ref } from 'vue'
import type { DailyTask, TaskTemplate } from '../../../entities/TaskEntity'
import type { PaymentStatus } from '../../../entities/BillingEntity'
import type { ID } from '../../../entities/types'
import { useSettings } from '../../../composables/useSettings'
import { useAuth } from '../../../composables/useAuth'
import DayBarChart from './DayBarChart.vue'
import ProjectProgressList from './ProjectProgressList.vue'
import ProjectRatesDialog from './ProjectRatesDialog.vue'
import ProjectBillingDialog from './ProjectBillingDialog.vue'
import HabitMonthSection from './HabitMonthSection.vue'
import IncomeGoalCard from './IncomeGoalCard.vue'
import ClientSummaryTable from './ClientSummaryTable.vue'
import AnalyticsHero from './AnalyticsHero.vue'
import {
  PERIOD_OPTIONS,
  useTimerAnalytics,
} from '../composables/useTimerAnalytics'
import { usePlanVsActual } from '../composables/usePlanVsActual'
import { mergeProjectProgress } from '../composables/projectProgress'
import { ANALYTICS_TAB, useAnalyticsTab } from '../composables/useAnalyticsTab'
import type { ProjectBilling } from '../composables/projectBilling'
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
  visibleTasks,
  showsMoney,
  rateNote,
  copied,
  habits,
  daySeries,
  chartTodayKey,
  seriesCaption,
  periodLabel,
  adjustedTotalMs,
  totalMoneyLabel,
  hoursLabel,
  shareLabel,
  percentLabel,
  projectNameOf,
  projectRows,
  hasAdjustments,
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

const { result: planResult } = usePlanVsActual({
  getPeriod: () => period.value,
  getGoals: () => props.goals,
  getTemplates: () => props.templates,
  getDailyTasks: () => props.dailyTasks,
  getActual: () => summary.value.byProject,
})

/** One row per project: tracked time against whatever is planned for it. */
const progressRows = computed(() =>
  mergeProjectProgress(
    projectRows.value.map((row) => ({
      key: row.key,
      goalId: row.goalId,
      title: row.title,
      color: row.color,
      taskCount: row.taskCount,
      trackedMs: row.figures.ms,
    })),
    planResult.value.rows,
  ),
)

/** The longest tasks are shown first; the rest sit behind the "All" chip. */
const TOP_TASK_COUNT = 5
const showAllTasks = ref(false)
const topTasks = computed(() =>
  showAllTasks.value ? visibleTasks.value : visibleTasks.value.slice(0, TOP_TASK_COUNT),
)

const tab = useAnalyticsTab()

const TAB_CHOICES = [
  { id: ANALYTICS_TAB.TIME, label: 'Time' },
  { id: ANALYTICS_TAB.MONEY, label: 'Money' },
  { id: ANALYTICS_TAB.HABITS, label: 'Habits' },
] as const

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
      <h2 class="analytics__title">Analytics</h2>
      <button
        class="ui-icon-btn ui-icon-btn--outlined"
        type="button"
        aria-label="Export report"
        :disabled="periodEntries.length === 0"
        @click="isExportOpen = true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M12 4v11M7 10l5 5 5-5M5 20h14"></path>
        </svg>
      </button>
    </header>

    <div class="ui-chips" role="group" aria-label="Period">
      <button
        v-for="option in PERIOD_OPTIONS"
        :key="option.id"
        class="ui-chip"
        :class="{ 'is-active': period === option.id }"
        type="button"
        :aria-pressed="period === option.id"
        @click="period = option.id"
      >
        {{ option.label }}
      </button>
    </div>

    <!-- The client filter narrows every tab, so it sits above them. -->
    <div v-if="hasClients" class="ui-chips" role="group" aria-label="Client">
      <button
        class="ui-chip"
        :class="{ 'is-active': clientFilter === ALL_CLIENTS_FILTER_ID }"
        type="button"
        :aria-pressed="clientFilter === ALL_CLIENTS_FILTER_ID"
        @click="clientFilter = ALL_CLIENTS_FILTER_ID"
      >
        All clients
      </button>
      <button
        v-for="choice in clientChoices"
        :key="choice.id"
        class="ui-chip"
        :class="{ 'is-active': clientFilter === choice.id }"
        type="button"
        :aria-pressed="clientFilter === choice.id"
        @click="clientFilter = choice.id"
      >
        {{ choice.label }}
      </button>
      <button
        class="ui-chip"
        :class="{ 'is-active': clientFilter === NO_CLIENT_FILTER_ID }"
        type="button"
        :aria-pressed="clientFilter === NO_CLIENT_FILTER_ID"
        @click="clientFilter = NO_CLIENT_FILTER_ID"
      >
        No client
      </button>
    </div>

    <AnalyticsHero
      :tracked-ms="adjustedTotalMs"
      :planned-ms="planResult.total.plannedMs"
      :session-count="summary.sessionCount"
      :day-count="summary.dayCount"
      :has-adjustments="hasAdjustments"
    />

    <div class="ui-tabs" role="tablist" aria-label="Analytics sections">
      <button
        v-for="choice in TAB_CHOICES"
        :id="`analytics-tab-${choice.id}`"
        :key="choice.id"
        class="ui-tab"
        :class="{ 'is-active': tab === choice.id }"
        type="button"
        role="tab"
        :aria-selected="tab === choice.id"
        :aria-controls="`analytics-panel-${choice.id}`"
        @click="tab = choice.id"
      >
        {{ choice.label }}
      </button>
    </div>

    <div
      v-if="tab === ANALYTICS_TAB.TIME"
      id="analytics-panel-time"
      class="analytics__panel"
      role="tabpanel"
      aria-labelledby="analytics-tab-time"
    >
      <p
        v-if="visibleTasks.length === 0 && projectRows.length === 0"
        class="timer-history__empty"
      >
        Nothing tracked in {{ periodLabel.toLowerCase() }} yet.
      </p>

      <template v-else>
        <div v-if="visibleTasks.length" class="analytics__charts">
          <DayBarChart
            :points="daySeries.points"
            :caption="seriesCaption"
            :format-hours="hoursLabel"
            :today-key="chartTodayKey"
          />
        </div>

        <ProjectProgressList v-if="progressRows.length" :rows="progressRows" />

        <template v-if="visibleTasks.length">
          <p class="sidebar-caption">Top tasks</p>
          <div class="analytics__tasks">
            <div v-for="task in topTasks" :key="task.key" class="time-total">
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

          <button
            v-if="visibleTasks.length > TOP_TASK_COUNT"
            class="ui-chip"
            :class="{ 'is-active': showAllTasks }"
            type="button"
            :aria-expanded="showAllTasks"
            @click="showAllTasks = !showAllTasks"
          >
            All {{ visibleTasks.length }} tasks
          </button>
        </template>
      </template>
    </div>

    <div
      v-else-if="tab === ANALYTICS_TAB.MONEY"
      id="analytics-panel-money"
      class="analytics__panel"
      role="tabpanel"
      aria-labelledby="analytics-tab-money"
    >
      <div class="analytics__cards">
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

      <template v-if="hasClients && clientRows.length">
        <p class="sidebar-caption">By client</p>
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
    </div>

    <div
      v-else
      id="analytics-panel-habits"
      class="analytics__panel"
      role="tabpanel"
      aria-labelledby="analytics-tab-habits"
    >
      <HabitMonthSection
        :goals="goals"
        :templates="filteredTemplates"
        :daily-tasks="dailyTasks"
      />

      <template v-if="habits.length">
        <p class="sidebar-caption">Repeating tasks</p>
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
    </div>

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
      :copied="copied"
      @copy-report="copyReport"
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
