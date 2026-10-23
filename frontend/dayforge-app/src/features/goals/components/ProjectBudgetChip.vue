<script setup lang="ts">
import { computed } from 'vue'
import { useSettings } from '../../../composables/useSettings'
import {
  BUDGET_LEVEL,
  BUDGET_PERIOD,
  type BudgetStanding,
} from '../../analytics/composables/projectBudget'

const props = defineProps<{ standing: BudgetStanding }>()

const { settings } = useSettings()

const percent = computed(() => Math.round(props.standing.fraction * 100))

/** The bar stops at full; the chip text carries the real figure past 100%. */
const barWidth = computed(() => `${Math.min(props.standing.fraction, 1) * 100}%`)

const stateLabel = computed(() => {
  if (props.standing.level === BUDGET_LEVEL.OVER) return 'Over budget'
  if (props.standing.level === BUDGET_LEVEL.WARN) return 'Nearly used up'
  return 'Budget'
})

const periodLabel = computed(() =>
  props.standing.budget.period === BUDGET_PERIOD.MONTH ? 'this month' : 'in total',
)

const detail = computed(() => {
  const { budget, usage, hoursFraction, amountFraction } = props.standing
  const parts: string[] = []

  if (budget.hours !== undefined && hoursFraction !== null) {
    const spent = (usage.trackedMs / 3_600_000).toFixed(1)
    parts.push(`${spent} of ${budget.hours} h tracked`)
  }
  if (budget.amount !== undefined && amountFraction !== null) {
    const money = new Intl.NumberFormat(settings.format.locale, {
      style: 'currency',
      currency: settings.timer.currency,
      maximumFractionDigits: 2,
    })
    parts.push(`${money.format(usage.earned)} of ${money.format(budget.amount)} earned`)
  }

  return `${parts.join(' · ')} ${periodLabel.value}`
})
</script>

<template>
  <div
    class="budget-chip"
    :class="`is-${standing.level}`"
    role="status"
    :aria-label="`${stateLabel} ${percent}%. ${detail}`"
    :title="detail"
  >
    <span class="budget-chip__text">
      {{ stateLabel }} <strong>{{ percent }}%</strong>
    </span>
    <span class="budget-chip__bar" aria-hidden="true">
      <span :style="{ width: barWidth }"></span>
    </span>
  </div>
</template>
