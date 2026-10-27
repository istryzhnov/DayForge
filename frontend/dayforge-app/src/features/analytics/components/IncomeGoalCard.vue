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
  INCOME_STATE,
  incomeGoalStatus,
  sanitizeMonthlyIncome,
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

const goalAmount = computed(() => sanitizeMonthlyIncome(settings.goals.monthlyIncome))

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

const paceText = computed(() => {
  const current = status.value
  if (!current) return ''

  switch (current.state) {
    case INCOME_STATE.REACHED:
      return 'Goal reached this month.'
    case INCOME_STATE.PENDING:
      return 'The pace starts on the first working day of the month.'
    case INCOME_STATE.BEHIND:
      return `Behind by ${money.value.format(current.behindBy)}`
    default:
      return 'On track'
  }
})

const forecastText = computed(() => {
  const current = status.value
  if (!current || current.forecast === null) return ''
  return `Pace projects ${money.value.format(current.forecast)} by month end`
})

const dayText = computed(() => {
  const current = status.value
  if (!current) return ''
  return `Working day ${current.elapsedWorkingDays} of ${current.totalWorkingDays}`
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
        <span class="analytics__card-note">
          See how this month's earnings compare with a target, and where the
          pace is heading.
        </span>
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
      <p v-if="error" class="project-billing__error" role="alert">{{ error }}</p>
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
        <div class="income-goal__earned">
          <span class="analytics__card-label">Earned this month</span>
          <strong class="analytics__card-value">
            {{ money.format(status.earned) }}
          </strong>
          <span class="analytics__card-note">
            of {{ money.format(status.goal) }} goal · {{ dayText }}
          </span>
        </div>
        <button class="btn btn-ghost income-goal__edit" type="button" @click="startEditing">
          Edit goal
        </button>
      </div>

      <div
        class="income-goal__meter"
        role="progressbar"
        aria-label="Share of the monthly goal earned"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="Math.min(100, Math.round(status.fraction * 100))"
      >
        <span :style="{ width: barWidth }"></span>
      </div>

      <div class="income-goal__foot">
        <span class="income-goal__percent">{{ percentLabel }} of goal</span>
        <span
          class="income-goal__pace"
          :class="`is-${status.state}`"
        >
          {{ paceText }}
        </span>
        <span v-if="forecastText" class="analytics__card-note">
          {{ forecastText }}
        </span>
      </div>
    </div>
  </section>
</template>
