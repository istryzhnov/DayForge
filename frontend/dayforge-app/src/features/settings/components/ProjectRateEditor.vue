<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Goal } from '../../../entities/GoalEntity'
import { useProjectRateField } from '../composables/useProjectRateField'

const props = defineProps<{ goal: Goal }>()

const emit = defineEmits<{
  (e: 'update-rate', hourlyRate: number | undefined): void
}>()

const { t } = useI18n()
const { draft, currency, hasOwnRate, placeholder, commit, clear } =
  useProjectRateField(props, {
    onUpdate: (hourlyRate) => emit('update-rate', hourlyRate),
  })
</script>

<template>
  <div class="project-rate">
    <div class="settings-times">
      <label>
        {{ t('billing.perHour', { currency }) }}
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
      {{ t('billing.useDefaultRate') }}
    </button>
  </div>
</template>
