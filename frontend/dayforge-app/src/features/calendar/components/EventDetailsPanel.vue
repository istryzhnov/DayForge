<script setup lang="ts">
import AppIcon from '../../../components/AppIcon.vue'
import { useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DailyTask, MajorTaskOption } from '../../../entities/TaskEntity'
import type { Goal } from '../../../entities/GoalEntity'
import type { ID } from '../../../entities/types'
import { useFocusTrap } from '../../../composables/useFocusTrap'
import {
  isCommitShortcut,
  useNotesDraft,
  useTextareaFit,
} from '../../../composables/useNotesDraft'
import { useEventDetailsForm } from '../composables/useEventDetailsForm'

const props = defineProps<{
  task: DailyTask
  /** The task's notes, read from its template. */
  notes: string
  projectOptions: MajorTaskOption[]
  /** Project this task currently sits under, if any. */
  currentProjectId: ID | null
  goals: Goal[]
  /** Goal this task is tagged with, if any. */
  currentGoalId: ID | null
  /** A finished, scheduled block with no time logged over it yet. */
  canLogPlanned?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'log-planned'): void
  (e: 'unschedule', taskId: ID): void
  (
    e: 'update-time',
    payload: { taskId: ID; startTime: string; endTime: string },
  ): void
  (e: 'update-title', payload: { templateId: ID; title: string }): void
  (e: 'update-notes', payload: { templateId: ID; notes: string }): void
  (e: 'update-goal', payload: { templateId: ID; goalId: ID | undefined }): void
  (
    e: 'update-project',
    payload: { templateId: ID; projectTemplateId: ID | null },
  ): void
}>()

// Binds to the `ref="trapRef"` root element below.
const { t } = useI18n()

useFocusTrap({ onEscape: () => emit('close') })

const notesInput = useTemplateRef<HTMLTextAreaElement>('notesInput')

// Committed on blur, so tapping Save or the backdrop keeps what was typed.
const {
  draft: notes,
  commit: commitNotes,
  revert: revertNotes,
} = useNotesDraft(
  () => props.notes,
  (next) =>
    emit('update-notes', { templateId: props.task.templateId, notes: next }),
)
useTextareaFit(notesInput, notes)

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

/** Esc drops an unsaved note; the panel's own Esc then closes it as before. */
function onNotesKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    revertNotes()
    return
  }
  if (isCommitShortcut(event)) {
    event.preventDefault()
    commitNotes()
    save()
  }
}
</script>

<template>
  <div class="event-details-overlay" @click.self="emit('close')">
    <div
      ref="trapRef"
      class="event-details"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-details-title"
    >
      <header class="event-details__head">
        <span class="dot" :class="task.priority"></span>
        <strong id="event-details-title">{{ task.title }}</strong>
        <button
          class="event-details__close"
          type="button"
          :aria-label="t('calendar.close')"
          @click="emit('close')"
        >
          <AppIcon name="close" :size="14" />
        </button>
      </header>

      <label class="event-details__field">
        <span class="event-details__label">{{ t('calendar.titleField') }}</span>
        <input v-model="title" type="text" @keydown.enter="save" />
      </label>

      <label class="event-details__field">
        <span class="event-details__label">{{ t('calendar.notesField') }}</span>
        <textarea
          ref="notesInput"
          v-model="notes"
          rows="2"
          maxlength="5000"
          :placeholder="t('calendar.notesPlaceholder')"
          @blur="commitNotes"
          @keydown="onNotesKeydown"
        ></textarea>
      </label>

      <label class="event-details__field">
        <span class="event-details__label">{{ t('calendar.goalField') }}</span>
        <select v-model="goalId">
          <option value="">{{ t('calendar.noGoal') }}</option>
          <option v-for="goal in goals" :key="goal.id" :value="goal.id">
            {{ goal.title }}
          </option>
        </select>
      </label>

      <label v-if="canAttachToProject" class="event-details__field">
        <span class="event-details__label">{{
          t('calendar.projectField')
        }}</span>
        <select v-model="projectId">
          <option value="">{{ t('calendar.noProject') }}</option>
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
          {{ t('calendar.startField') }}
          <input v-model="startTime" type="time" />
        </label>
        <label>
          {{ t('calendar.endField') }}
          <input v-model="endTime" type="time" />
        </label>
      </div>

      <div class="event-details__actions">
        <button class="btn btn-primary" type="button" @click="save">
          {{ t('calendar.save') }}
        </button>
        <button
          v-if="canLogPlanned"
          class="btn btn-ghost"
          type="button"
          @click="emit('log-planned')"
        >
          {{ t('calendar.logPlanned') }}
        </button>
        <button
          class="btn btn-ghost"
          type="button"
          @click="emit('unschedule', task.id)"
        >
          {{ t('calendar.unschedule') }}
        </button>
      </div>
    </div>
  </div>
</template>
