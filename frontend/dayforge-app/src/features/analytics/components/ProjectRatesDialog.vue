<script setup lang="ts">
import type { Goal } from '../../../entities/GoalEntity'
import type { ID } from '../../../entities/types'
import { useI18n } from 'vue-i18n'
import { useFocusTrap } from '../../../composables/useFocusTrap'
import ProjectRateEditor from '../../settings/components/ProjectRateEditor.vue'

const { t } = useI18n()

defineProps<{ goals: Goal[] }>()

const emit = defineEmits<{
  (e: 'update-rate', goalId: ID, hourlyRate: number | undefined): void
  (e: 'close'): void
}>()

useFocusTrap({ onEscape: () => emit('close') })
</script>

<template>
  <div ref="trapRef" class="new-goal-modal" @click.self="emit('close')">
    <div class="modal-overlay" @click="emit('close')"></div>
    <div
      class="modal-card project-rates"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-rates-title"
    >
      <h3 id="project-rates-title">{{ t('analytics.ratesTitle') }}</h3>
      <p class="settings-group-hint">{{ t('analytics.ratesHint') }}</p>

      <div v-for="goal in goals" :key="goal.id" class="project-rates__row">
        <span class="project-rates__name">{{ goal.title }}</span>
        <ProjectRateEditor
          :goal="goal"
          @update-rate="(rate) => emit('update-rate', goal.id, rate)"
        />
      </div>

      <p v-if="goals.length === 0" class="settings-group-hint">
        {{ t('analytics.ratesEmpty') }}
      </p>

      <div class="modal-actions">
        <button class="btn btn-primary" type="button" @click="emit('close')">
          {{ t('analytics.done') }}
        </button>
      </div>
    </div>
  </div>
</template>
