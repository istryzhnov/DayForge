<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { TaskTemplate } from '../../../entities/TaskEntity'
import { useSettings } from '../../../composables/useSettings'
import { useTimeEntries } from '../../../composables/useTimeEntries'
import {
  ANALYTICS_PERIOD,
  entriesInRange,
  periodRange,
} from '../../../composables/timer/analytics'
import { buildRateLookup } from '../../../composables/timer/rates'
import { projectEarnings, totalEarned } from '../composables/projectEarnings'
import {
  INCOME_GOAL_MAX,
  amountPerDayNeeded,
  incomeGoalStatus,
  sanitizeMonthlyIncome,
  workingDaysLeft,
} from '../composables/incomeGoal'

const props = defineProps<{
  goals: Goal[]
  templates: TaskTemplate[]
}>()

const { settings, update } = useSettings()
const { entries } = useTimeEntries()

const money = computed(
  () =>
    new Intl.NumberFormat(settings.format.locale, {
      style: 'currency',
      currency: settings.timer.currency,
      maximumFractionDigits: 0,
    }),
)

const goalAmount = computed(() =>
  sanitizeMonthlyIncome(settings.goals.monthlyIncome),
)

/**
 * Earned this month, adjusted the way the Analytics totals are: fixed prices
 * pro-rated, rates per task and project. Always the current month, whatever
 * period the page is showing.
 */
const earned = computed(() => {
  const now = new Date()
  const monthEntries = entriesInRange(
    entries.value,
    periodRange(ANALYTICS_PERIOD.THIS_MONTH, now),
  )
  return totalEarned(
    projectEarnings({
      allEntries: entries.value,
      periodEntries: monthEntries,
      goals: props.goals,
      lookup: buildRateLookup(
        props.templates,
        props.goals,
        settings.timer.hourlyRate,
      ),
      isAllTime: false,
    }),
  )
})

const status = computed(() =>
  incomeGoalStatus(goalAmount.value, earned.value, new Date()),
)

const isEditing = ref(false)
const draft = ref('')
const error = ref('')

const percentLabel = computed(() =>
  status.value ? `${Math.round(status.value.fraction * 100)}%` : '',
)

const barWidth = computed(() =>
  status.value ? `${Math.min(status.value.fraction, 1) * 100}%` : '0%',
)

/** Where the month's pace stands: the share of working days already gone. */
const paceLeft = computed(() => {
  const current = status.value
  if (!current || current.totalWorkingDays === 0) return '0%'
  return `${(current.elapsedWorkingDays / current.totalWorkingDays) * 100}%`
})

/** Amount per working day still to come, today included; null hides the line. */
const perDayText = computed(() => {
  const current = status.value
  if (!current) return ''
  const needed = amountPerDayNeeded(
    current.goal,
    current.earned,
    workingDaysLeft(new Date()),
  )
  return needed === null ? '' : `${money.value.format(needed)} / day`
})

function startEditing() {
  draft.value = goalAmount.value !== undefined ? String(goalAmount.value) : ''
  error.value = ''
  isEditing.value = true
}

function save() {
  const text = String(draft.value).trim().replace(',', '.')
  const value = text === '' ? undefined : Number(text)

  if (value !== undefined && sanitizeMonthlyIncome(value) === undefined) {
    error.value = `Enter an amount above 0 and up to ${INCOME_GOAL_MAX.toLocaleString('en-US')}.`
    return
  }

  update('goals', { monthlyIncome: value })
  isEditing.value = false
  error.value = ''
}

function clear() {
  update('goals', { monthlyIncome: undefined })
  isEditing.value = false
  error.value = ''
}
</script>

<template>
  <section class="income-goal" aria-label="Monthly income goal">
    <template v-if="!status && !isEditing">
      <button class="income-goal__empty" type="button" @click="startEditing">
        <span class="analytics__card-label">Monthly income goal</span>
        <strong>Set a goal</strong>
      </button>
    </template>

    <form
      v-else-if="isEditing"
      class="income-goal__form"
      @submit.prevent="save"
    >
      <label class="income-goal__field">
        <span class="analytics__card-label">
          Monthly goal ({{ settings.timer.currency }})
        </span>
        <input
          v-model="draft"
          type="number"
          min="0"
          step="any"
          inputmode="decimal"
          placeholder="e.g. 3000"
          @input="error = ''"
        />
      </label>
      <p v-if="error" class="project-billing__error" role="alert">
        {{ error }}
      </p>
      <div class="income-goal__actions">
        <button class="btn btn-primary" type="submit">Save goal</button>
        <button class="btn btn-ghost" type="button" @click="isEditing = false">
          Cancel
        </button>
        <button
          v-if="goalAmount !== undefined"
          class="btn btn-ghost"
          type="button"
          @click="clear"
        >
          Remove goal
        </button>
      </div>
    </form>

    <div v-else-if="status" class="income-goal__body">
      <div class="income-goal__head">
        <div class="income-goal__figure">
          <span class="analytics__card-label">Earned this month</span>
          <span class="income-goal__amount">
            <strong class="income-goal__earned">{{
              money.format(status.earned)
            }}</strong>
            <span class="income-goal__goal"
              >/ {{ money.format(status.goal) }}</span
            >
          </span>
        </div>
        <span class="income-goal__percent">{{ percentLabel }}</span>
        <button
          class="btn btn-ghost income-goal__edit"
          type="button"
          @click="startEditing"
        >
          Edit goal
        </button>
      </div>

      <div class="income-goal__track">
        <div
          class="ui-progress"
          role="progressbar"
          aria-label="Share of the monthly goal earned"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="Math.min(100, Math.round(status.fraction * 100))"
        >
          <span :style="{ width: barWidth }"></span>
        </div>
        <!-- Where the month should stand by now, given the working days gone. -->
        <span
          class="income-goal__pace"
          :style="{ left: paceLeft }"
          aria-hidden="true"
        ></span>
      </div>

      <p v-if="perDayText" class="income-goal__need">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12h14M13 6l6 6-6 6"></path>
        </svg>
        {{ perDayText }}
      </p>
    </div>
  </section>
</template>
