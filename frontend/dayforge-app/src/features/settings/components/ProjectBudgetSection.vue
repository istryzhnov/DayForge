<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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

const props = defineProps<{ goal: Goal }>()

const emit = defineEmits<{
  (e: 'update-budget', budget: ProjectBudget | undefined): void
}>()

const { settings } = useSettings()
const currency = computed(() => settings.timer.currency)

const PERIODS: ReadonlyArray<{ id: BudgetPeriod; label: string }> = [
  { id: BUDGET_PERIOD.TOTAL, label: 'Whole project' },
  { id: BUDGET_PERIOD.MONTH, label: 'Each month' },
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
  const result = parseBudgetDraft(draft.value)
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
    <p class="sidebar-caption">Budget</p>

    <p class="settings-group-hint">
      A limit for this project. Progress shows in the project header, and you
      get a notice at 80% and at 100%.
    </p>

    <div class="settings-times">
      <label>
        Hours
        <input
          v-model="draft.hours"
          type="number"
          min="0"
          step="any"
          inputmode="decimal"
          placeholder="No limit"
          @input="error = ''"
        />
      </label>
      <label>
        Money ({{ currency }})
        <input
          v-model="draft.amount"
          type="number"
          min="0"
          step="any"
          inputmode="decimal"
          placeholder="No limit"
          @input="error = ''"
        />
      </label>
    </div>

    <div
      class="settings-chips budget-period"
      role="group"
      aria-label="Budget period"
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
        {{ period.label }}
      </button>
    </div>

    <p v-if="error" class="project-billing__error" role="alert">{{ error }}</p>

    <div class="budget-editor__actions">
      <button
        class="btn btn-primary settings-action"
        type="button"
        @click="save"
      >
        Save budget
      </button>
      <button
        v-if="hasBudget"
        class="btn btn-ghost settings-reset"
        type="button"
        @click="clear"
      >
        Remove budget
      </button>
    </div>
  </div>
</template>
