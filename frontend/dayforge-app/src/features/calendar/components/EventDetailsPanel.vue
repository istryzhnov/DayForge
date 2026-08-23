<script setup lang="ts">
import type { DailyTask, MajorTaskOption } from '../../../entities/TaskEntity'
import type { Goal } from '../../../entities/GoalEntity'
import type { ID } from '../../../entities/types'
import { useFocusTrap } from '../../../composables/useFocusTrap'
import { useEventDetailsForm } from '../composables/useEventDetailsForm'

const props = defineProps<{
  task: DailyTask
  projectOptions: MajorTaskOption[]
  /** Project this task currently sits under, if any. */
  currentProjectId: ID | null
  goals: Goal[]
  /** Goal this task is tagged with, if any. */
  currentGoalId: ID | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'unschedule', taskId: ID): void
  (
    e: 'update-time',
    payload: { taskId: ID; startTime: string; endTime: string },
  ): void
  (e: 'update-title', payload: { templateId: ID; title: string }): void
  (e: 'update-goal', payload: { templateId: ID; goalId: ID | undefined }): void
  (
    e: 'update-project',
    payload: { templateId: ID; projectTemplateId: ID | null },
  ): void
}>()

// Binds to the `ref="trapRef"` root element below.
useFocusTrap({ onEscape: () => emit('close') })

const {
  title,
  startTime,
  endTime,
  goalId,
  projectId,
  canAttachToProject,
  projectsForGoal,
  save,
} = useEventDetailsForm(props, {
  onUpdateTitle: (payload) => emit('update-title', payload),
  onUpdateGoal: (payload) => emit('update-goal', payload),
  onUpdateProject: (payload) => emit('update-project', payload),
  onUpdateTime: (payload) => emit('update-time', payload),
})
</script>

<template>
  <div class="event-details-overlay" @click.self="emit('close')">
    <div ref="trapRef" class="event-details" role="dialog" aria-modal="true">
      <header class="event-details__head">
        <span class="dot" :class="task.priority"></span>
        <strong>{{ task.title }}</strong>
        <button
          class="event-details__close"
          type="button"
          aria-label="Close"
          @click="emit('close')"
        >
          ×
        </button>
      </header>

      <label class="event-details__field">
        <span class="event-details__label">Title</span>
        <input v-model="title" type="text" @keydown.enter="save" />
      </label>

      <label class="event-details__field">
        <span class="event-details__label">Goal</span>
        <select v-model="goalId">
          <option value="">No goal</option>
          <option v-for="goal in goals" :key="goal.id" :value="goal.id">
            {{ goal.title }}
          </option>
        </select>
      </label>

      <label v-if="canAttachToProject" class="event-details__field">
        <span class="event-details__label">Project</span>
        <select v-model="projectId">
          <option value="">No project</option>
          <option
            v-for="option in projectsForGoal"
            :key="option.id"
            :value="option.id"
          >
            {{ option.title }}
          </option>
        </select>
      </label>

      <div class="event-details__time">
        <label>
          Start
          <input v-model="startTime" type="time" />
        </label>
        <label>
          End
          <input v-model="endTime" type="time" />
        </label>
      </div>

      <div class="event-details__actions">
        <button class="btn btn-primary" type="button" @click="save">
          Save
        </button>
        <button
          class="btn btn-ghost"
          type="button"
          @click="emit('unschedule', task.id)"
        >
          Unschedule
        </button>
      </div>
    </div>
  </div>
</template>
