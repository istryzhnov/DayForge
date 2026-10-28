<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Goal } from '../../../entities/GoalEntity'
import { useFocusTrap } from '../../../composables/useFocusTrap'
import { useSettings } from '../../../composables/useSettings'
import { formatHoursMinutes } from '../../../composables/timer/format'
import { durationWords } from '../../../composables/timer/text'
import {
  draftFromBilling,
  parseBillingDraft,
  type Messages,
  type ProjectBilling,
} from '../composables/projectBilling'

const props = defineProps<{
  goal: Goal
  /** Tracked over all time, shown as a reference next to the hours field. */
  trackedMs: number
}>()

const emit = defineEmits<{
  (e: 'save', billing: ProjectBilling | undefined): void
  (e: 'close'): void
}>()

const { settings } = useSettings()
const { t } = useI18n()
useFocusTrap({ onEscape: () => emit('close') })

const currency = computed(() => settings.timer.currency)
const trackedLabel = computed(() =>
  formatHoursMinutes(props.trackedMs, durationWords()),
)

const draft = ref(draftFromBilling(props.goal.billing))
const error = ref('')

function save() {
  const messages: Messages = {
    text: (key, params) => t(key, params ?? {}),
    locale: settings.format.locale,
  }
  const result = parseBillingDraft(draft.value, messages)
  if (!result.ok) {
    error.value = result.error
    return
  }
  emit('save', result.billing)
}

function clear() {
  emit('save', undefined)
}
</script>

<template>
  <div class="new-goal-modal" @click.self="emit('close')">
    <div class="modal-overlay" @click="emit('close')"></div>
    <form
      ref="trapRef"
      class="modal-card project-billing"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-billing-title"
      @submit.prevent="save"
    >
      <h3 id="project-billing-title">{{ goal.title }}</h3>
      <p class="project-billing__note">{{ t('analytics.billingNote') }}</p>

      <label class="project-billing__field">
        <span>{{ t('analytics.fixedPriceLabel', { currency }) }}</span>
        <input
          v-model="draft.fixedPrice"
          type="number"
          min="0"
          step="any"
          inputmode="decimal"
          :placeholder="t('analytics.pricedByHours')"
          @input="error = ''"
        />
        <em>{{ t('analytics.fixedPriceHint') }}</em>
      </label>

      <label class="project-billing__field">
        <span>{{ t('analytics.hoursSpent') }}</span>
        <input
          v-model="draft.manualHours"
          type="number"
          min="0"
          step="any"
          inputmode="decimal"
          :placeholder="t('analytics.trackedTime')"
          @input="error = ''"
        />
        <em>{{ t('analytics.hoursHint', { tracked: trackedLabel }) }}</em>
      </label>

      <label class="project-billing__field">
        <span>{{ t('analytics.noteOptional') }}</span>
        <input
          v-model="draft.note"
          type="text"
          maxlength="500"
          :placeholder="t('analytics.notePlaceholder')"
          @input="error = ''"
        />
      </label>

      <p v-if="error" class="project-billing__error" role="alert">
        {{ error }}
      </p>

      <div class="modal-actions project-billing__actions">
        <button class="btn btn-ghost" type="button" @click="clear">
          {{ t('analytics.clearAdjustments') }}
        </button>
        <button class="btn btn-ghost" type="button" @click="emit('close')">
          {{ t('analytics.cancel') }}
        </button>
        <button class="btn btn-primary" type="submit">
          {{ t('analytics.save') }}
        </button>
      </div>
    </form>
  </div>
</template>
