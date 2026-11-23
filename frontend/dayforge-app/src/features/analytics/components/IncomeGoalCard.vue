<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Goal } from '../../../entities/GoalEntity'
import type { TaskTemplate } from '../../../entities/TaskEntity'
import { useSettings } from '../../../shared/composables/useSettings'
import { useTimeEntries } from '../../../shared/composables/useTimeEntries'
import {
  ANALYTICS_PERIOD,
  entriesInRange,
  periodRange,
} from '../../../shared/composables/timer/analytics'
import { buildRateLookup } from '../../../shared/composables/timer/rates'
import {
  projectEarnings,
  totalEarned,
} from '../../../shared/composables/billing/projectEarnings'
import {
  amountPerDayNeeded,
  incomeGoalStatus,
  workingDaysLeft,
} from '../composables/incomeGoal'
import {
  INCOME_GOAL_MAX,
  sanitizeMonthlyIncome,
} from '../../../shared/composables/billing/monthlyIncome'

const props = defineProps<{
  goals: Goal[]
  templates: TaskTemplate[]
}>()

const { settings, update } = useSettings()
const { entries } = useTimeEntries()
const { t } = useI18n()

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

/** Circumference of the ring (r = 54), with the arc capped at a full turn. */
const RING_LENGTH = 2 * Math.PI * 54
const ringDash = computed(() => {
  const fraction = Math.min(status.value?.fraction ?? 0, 1)
  return `${fraction * RING_LENGTH} ${RING_LENGTH}`
})

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
  return needed === null
    ? ''
    : t('analytics.amountPerDay', { amount: money.value.format(needed) })
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
    error.value = t('analytics.goalError', {
      max: INCOME_GOAL_MAX.toLocaleString(settings.format.locale),
    })
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
  <section class="income-goal" :aria-label="t('analytics.goalAria')">
    <template v-if="!status && !isEditing">
      <button class="income-goal__empty" type="button" @click="startEditing">
        <span class="analytics__card-label">{{
          t('analytics.goalLabel')
        }}</span>
        <strong>{{ t('analytics.setGoal') }}</strong>
      </button>
    </template>

    <form
      v-else-if="isEditing"
      class="income-goal__form"
      @submit.prevent="save"
    >
      <label class="income-goal__field">
        <span class="analytics__card-label">
          {{
            t('analytics.goalFieldLabel', { currency: settings.timer.currency })
          }}
        </span>
        <input
          v-model="draft"
          type="number"
          min="0"
          step="any"
          inputmode="decimal"
          :placeholder="t('analytics.goalPlaceholder')"
          @input="error = ''"
        />
      </label>
      <p v-if="error" class="project-billing__error" role="alert">
        {{ error }}
      </p>
      <div class="income-goal__actions">
        <button class="btn btn-primary" type="submit">
          {{ t('analytics.saveGoal') }}
        </button>
        <button class="btn btn-ghost" type="button" @click="isEditing = false">
          {{ t('analytics.cancel') }}
        </button>
        <button
          v-if="goalAmount !== undefined"
          class="btn btn-ghost"
          type="button"
          @click="clear"
        >
          {{ t('analytics.removeGoal') }}
        </button>
      </div>
    </form>

    <div v-else-if="status" class="income-goal__body">
      <div class="income-goal__head">
        <svg class="income-goal__ring" viewBox="0 0 130 130" aria-hidden="true">
          <circle class="income-goal__ring-track" cx="65" cy="65" r="54" />
          <circle
            class="income-goal__ring-arc"
            cx="65"
            cy="65"
            r="54"
            :stroke-dasharray="ringDash"
            transform="rotate(-90 65 65)"
          />
          <text
            class="income-goal__ring-text"
            x="65"
            y="72"
            text-anchor="middle"
          >
            {{ percentLabel }}
          </text>
        </svg>
        <div class="income-goal__figure">
          <span class="analytics__card-label">{{
            t('analytics.earnedThisMonth')
          }}</span>
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
          {{ t('analytics.editGoal') }}
        </button>
      </div>

      <div class="income-goal__track">
        <div
          class="ui-progress"
          role="progressbar"
          :aria-label="t('analytics.goalProgressAria')"
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
