<script setup lang="ts">
import type { Goal } from '../../../entities/GoalEntity'
import type { ID } from '../../../entities/types'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '../../../shared/ui/AppIcon.vue'
import { useFocusTrap } from '../../../shared/composables/useFocusTrap'
import { ProjectRateEditor } from '../../settings'

const { t } = useI18n()

defineProps<{ goals: Goal[] }>()

const emit = defineEmits<{
  (e: 'update-rate', goalId: ID, hourlyRate: number | undefined): void
  (e: 'close'): void
}>()

useFocusTrap({ onEscape: () => emit('close') })

const showInfo = ref(false)
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
      <button
        type="button"
        class="ui-icon-btn"
        :title="t('common.aboutThis')"
        :aria-label="t('common.aboutThis')"
        :aria-expanded="showInfo"
        @click="showInfo = !showInfo"
      >
        <AppIcon name="info" :size="16" />
      </button>
      <p v-if="showInfo" class="settings-group-hint">
        {{ t('analytics.ratesHint') }}
      </p>

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
