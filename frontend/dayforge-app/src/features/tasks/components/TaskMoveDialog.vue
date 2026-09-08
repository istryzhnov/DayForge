<script setup lang="ts">
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
      <h3>Move "{{ template.title }}"</h3>

      <label class="timer-field">
        Goal
        <select v-model="goalId" @change="syncProjectToGoal">
          <option value="">No goal</option>
          <option v-for="goal in goals" :key="goal.id" :value="goal.id">
            {{ goal.title }}
          </option>
        </select>
      </label>

      <label v-if="canAttachToProject" class="timer-field">
        Project
        <select v-model="projectId">
          <option value="">On its own</option>
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
        A project groups other tasks, so it cannot sit inside one.
      </p>

      <p
        v-if="canAttachToProject && projectsForGoal.length === 0"
        class="settings-group-hint"
      >
        That goal has no project to attach this to yet.
      </p>

      <div class="modal-actions">
        <button class="btn btn-ghost" type="button" @click="emit('close')">
          Cancel
        </button>
        <button class="btn btn-primary" type="button" @click="submit">
          Move
        </button>
      </div>
    </div>
  </div>
</template>
