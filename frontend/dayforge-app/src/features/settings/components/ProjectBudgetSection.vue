<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Goal } from '../../../entities/GoalEntity'
import { useSettings } from '../../../composables/useSettings'
import {
  BUDGET_PERIOD,
  draftFromBudget,
  parseBudgetDraft,
  sanitizeBudget,
  type BudgetDraft,
  type BudgetPeriod,
  type ProjectBudget,
} from '../../analytics/composables/projectBudget'
import type { Messages } from '../../analytics/composables/projectBilling'

const props = defineProps<{ goal: Goal }>()

const emit = defineEmits<{
  (e: 'update-budget', budget: ProjectBudget | undefined): void
}>()

const { settings } = useSettings()
const { t } = useI18n()
const currency = computed(() => settings.timer.currency)

/** `labelKey` is rendered with `t()` in the template, so a language switch updates it. */
const PERIODS: ReadonlyArray<{ id: BudgetPeriod; labelKey: string }> = [
  { id: BUDGET_PERIOD.TOTAL, labelKey: 'billing.periodWhole' },
  { id: BUDGET_PERIOD.MONTH, labelKey: 'billing.periodMonth' },
]

const draft = ref<BudgetDraft>(
  draftFromBudget(sanitizeBudget(props.goal.budget)),
)
const error = ref('')

const hasBudget = computed(
  () => sanitizeBudget(props.goal.budget) !== undefined,
)

// Switching projects in the same panel must not carry the old figures over.
watch(
  () => props.goal.id,
  () => {
    draft.value = draftFromBudget(sanitizeBudget(props.goal.budget))
    error.value = ''
  },
)

function save() {
  const messages: Messages = {
    text: (key, params) => t(key, params ?? {}),
    locale: settings.format.locale,
  }
  const result = parseBudgetDraft(draft.value, messages)
  if (!result.ok) {
    error.value = result.error
    return
  }
  error.value = ''
  emit('update-budget', result.budget)
}

function clear() {
  draft.value = { hours: '', amount: '', period: BUDGET_PERIOD.TOTAL }
  error.value = ''
  emit('update-budget', undefined)
}
</script>

<template>
  <div class="settings-section">
    <p class="sidebar-caption">{{ t('billing.budgetCaption') }}</p>

    <p class="settings-group-hint">
      {{ t('billing.budgetHint') }}
    </p>

    <div class="settings-times">
      <label>
        {{ t('billing.budgetHours') }}
        <input
          v-model="draft.hours"
          type="number"
          min="0"
          step="any"
          inputmode="decimal"
          :placeholder="t('billing.noLimit')"
          @input="error = ''"
        />
      </label>
      <label>
        {{ t('billing.budgetMoney', { currency }) }}
        <input
          v-model="draft.amount"
          type="number"
          min="0"
          step="any"
          inputmode="decimal"
          :placeholder="t('billing.noLimit')"
          @input="error = ''"
        />
      </label>
    </div>

    <div
      class="settings-chips budget-period"
      role="group"
      :aria-label="t('billing.budgetPeriodAria')"
    >
      <button
        v-for="period in PERIODS"
        :key="period.id"
        class="theme-chip"
        :class="{ active: draft.period === period.id }"
        type="button"
        :aria-pressed="draft.period === period.id"
        @click="draft.period = period.id"
      >
        {{ t(period.labelKey) }}
      </button>
    </div>

    <p v-if="error" class="project-billing__error" role="alert">{{ error }}</p>

    <div class="budget-editor__actions">
      <button
        class="btn btn-primary settings-action"
        type="button"
        @click="save"
      >
        {{ t('billing.saveBudget') }}
      </button>
      <button
        v-if="hasBudget"
        class="btn btn-ghost settings-reset"
        type="button"
        @click="clear"
      >
        {{ t('billing.removeBudget') }}
      </button>
    </div>
  </div>
</template>
