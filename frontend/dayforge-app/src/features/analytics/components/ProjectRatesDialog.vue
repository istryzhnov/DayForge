<script setup lang="ts">
import type { Goal } from '../../../entities/GoalEntity'
import type { ID } from '../../../entities/types'
import { useFocusTrap } from '../../../composables/useFocusTrap'
import ProjectRateEditor from '../../settings/components/ProjectRateEditor.vue'

defineProps<{ goals: Goal[] }>()

const emit = defineEmits<{
  (e: 'update-rate', goalId: ID, hourlyRate: number | undefined): void
  (e: 'close'): void
}>()

useFocusTrap({ onEscape: () => emit('close') })
</script>

<template>
  <div class="new-goal-modal" @click.self="emit('close')">
    <div class="modal-overlay" @click="emit('close')"></div>
    <div
      ref="trapRef"
      class="modal-card project-rates"
      role="dialog"
      aria-modal="true"
    >
      <h3>Hourly rates</h3>
      <p class="settings-group-hint">
        Each project bills at its own rate. Leave one empty to use the default
        from Settings → Timer.
      </p>

      <div v-for="goal in goals" :key="goal.id" class="project-rates__row">
        <span class="project-rates__name">{{ goal.title }}</span>
        <ProjectRateEditor
          :goal="goal"
          @update-rate="(rate) => emit('update-rate', goal.id, rate)"
        />
      </div>

      <p v-if="goals.length === 0" class="settings-group-hint">
        Create a project first, then set its rate here.
      </p>

      <div class="modal-actions">
        <button class="btn btn-primary" type="button" @click="emit('close')">
          Done
        </button>
      </div>
    </div>
  </div>
</template>
