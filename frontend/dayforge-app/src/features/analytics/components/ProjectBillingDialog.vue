<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import { useFocusTrap } from '../../../composables/useFocusTrap'
import { useSettings } from '../../../composables/useSettings'
import {
  draftFromBilling,
  parseBillingDraft,
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
useFocusTrap({ onEscape: () => emit('close') })

const currency = computed(() => settings.timer.currency)
const trackedLabel = computed(
  () => `${(props.trackedMs / (60 * 60 * 1000)).toFixed(2)} h`,
)

const draft = ref(draftFromBilling(props.goal.billing))
const error = ref('')

function save() {
  const result = parseBillingDraft(draft.value)
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
      <p class="project-billing__note">
        Only used in Analytics — your time entries stay as they are.
      </p>

      <label class="project-billing__field">
        <span>Fixed price ({{ currency }})</span>
        <input
          v-model="draft.fixedPrice"
          type="number"
          min="0"
          step="any"
          inputmode="decimal"
          placeholder="Priced by hours"
          @input="error = ''"
        />
        <em>
          All time shows this as the earnings. Shorter periods split it by
          their share of tracked time.
        </em>
      </label>

      <label class="project-billing__field">
        <span>Hours spent</span>
        <input
          v-model="draft.manualHours"
          type="number"
          min="0"
          step="any"
          inputmode="decimal"
          placeholder="Tracked time"
          @input="error = ''"
        />
        <em>
          Tracked so far: {{ trackedLabel }}. Used in All time only.
        </em>
      </label>

      <label class="project-billing__field">
        <span>Note (optional)</span>
        <input
          v-model="draft.note"
          type="text"
          maxlength="500"
          placeholder="e.g. paid by invoice 12"
          @input="error = ''"
        />
      </label>

      <p v-if="error" class="project-billing__error" role="alert">
        {{ error }}
      </p>

      <div class="modal-actions project-billing__actions">
        <button class="btn btn-ghost" type="button" @click="clear">
          Clear adjustments
        </button>
        <button class="btn btn-ghost" type="button" @click="emit('close')">
          Cancel
        </button>
        <button class="btn btn-primary" type="submit">Save</button>
      </div>
    </form>
  </div>
</template>
