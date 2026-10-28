<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Goal } from '../../../entities/GoalEntity'
import type {
  MajorTaskOption,
  TaskTemplate,
} from '../../../entities/TaskEntity'
import type { ID } from '../../../entities/types'
import { useFocusTrap } from '../../../composables/useFocusTrap'
import { useTaskMove } from '../composables/useTaskMove'

const props = defineProps<{
  template: TaskTemplate
  goals: Goal[]
  projectOptions: MajorTaskOption[]
}>()

const emit = defineEmits<{
  (e: 'assign-goal', templateId: ID, goalId: ID | undefined): void
  (e: 'attach-to-project', templateId: ID, projectTemplateId: ID | null): void
  (e: 'close'): void
}>()

const { t } = useI18n()

useFocusTrap({ onEscape: () => emit('close') })

const {
  goalId,
  projectId,
  canAttachToProject,
  projectsForGoal,
  syncProjectToGoal,
  save,
} = useTaskMove(props, {
  onAssignGoal: (templateId, value) => emit('assign-goal', templateId, value),
  onAttachToProject: (templateId, value) =>
    emit('attach-to-project', templateId, value),
})

function submit() {
  save()
  emit('close')
}
</script>

<template>
  <div class="new-goal-modal" @click.self="emit('close')">
    <div class="modal-overlay" @click="emit('close')"></div>
    <div
      ref="trapRef"
      class="modal-card task-move"
      role="dialog"
      aria-modal="true"
    >
      <h3>{{ t('tasks.moveTitle', { title: template.title }) }}</h3>

      <label class="timer-field">
        {{ t('tasks.goal') }}
        <select v-model="goalId" @change="syncProjectToGoal">
          <option value="">{{ t('tasks.noGoal') }}</option>
          <option v-for="goal in goals" :key="goal.id" :value="goal.id">
            {{ goal.title }}
          </option>
        </select>
      </label>

      <label v-if="canAttachToProject" class="timer-field">
        {{ t('goals.project') }}
        <select v-model="projectId">
          <option value="">{{ t('tasks.onItsOwn') }}</option>
          <option
            v-for="option in projectsForGoal"
            :key="option.id"
            :value="option.id"
          >
            {{ option.title }}
          </option>
        </select>
      </label>

      <p v-else class="settings-group-hint">
        {{ t('tasks.projectCannotNest') }}
      </p>

      <p
        v-if="canAttachToProject && projectsForGoal.length === 0"
        class="settings-group-hint"
      >
        {{ t('tasks.goalHasNoProject') }}
      </p>

      <div class="modal-actions">
        <button class="btn btn-ghost" type="button" @click="emit('close')">
          {{ t('common.cancel') }}
        </button>
        <button class="btn btn-primary" type="button" @click="submit">
          {{ t('tasks.move') }}
        </button>
      </div>
    </div>
  </div>
</template>
