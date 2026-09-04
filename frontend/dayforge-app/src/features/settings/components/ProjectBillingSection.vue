<script setup lang="ts">
import type { Goal } from '../../../entities/GoalEntity'
import { useProjectRateField } from '../composables/useProjectRateField'

const props = defineProps<{ goal: Goal }>()

const emit = defineEmits<{
  (e: 'update-rate', hourlyRate: number | undefined): void
}>()

const { draft, currency, hasOwnRate, hint, placeholder, commit, clear } =
  useProjectRateField(props, {
    onUpdate: (hourlyRate) => emit('update-rate', hourlyRate),
  })
</script>

<template>
  <div class="settings-section">
    <p class="sidebar-caption">Billing</p>

    <p class="settings-group-hint">{{ hint }}</p>

    <div class="settings-times">
      <label>
        Per hour ({{ currency }})
        <input
          v-model="draft"
          type="number"
          min="0"
          step="1"
          inputmode="decimal"
          :placeholder="placeholder"
          @change="commit"
          @keydown.enter="commit"
        />
      </label>
    </div>

    <button
      v-if="hasOwnRate"
      class="btn btn-ghost settings-reset"
      type="button"
      @click="clear"
    >
      Use the default rate
    </button>
  </div>
</template>
