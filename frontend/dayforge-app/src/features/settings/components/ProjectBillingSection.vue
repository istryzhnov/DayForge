<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Goal } from '../../../entities/GoalEntity'
import { useProjectRateField } from '../composables/useProjectRateField'
import ProjectRateEditor from './ProjectRateEditor.vue'

const props = defineProps<{ goal: Goal }>()

const emit = defineEmits<{
  (e: 'update-rate', hourlyRate: number | undefined): void
}>()

const { t } = useI18n()
const { hint } = useProjectRateField(props, {
  onUpdate: (hourlyRate) => emit('update-rate', hourlyRate),
})
</script>

<template>
  <div class="settings-section">
    <p class="ui-section-label ui-section-label--wrap">
      {{ t('billing.billingCaption') }}
    </p>

    <p class="settings-group-hint">{{ hint }}</p>

    <ProjectRateEditor
      :goal="goal"
      @update-rate="(rate) => emit('update-rate', rate)"
    />
  </div>
</template>
