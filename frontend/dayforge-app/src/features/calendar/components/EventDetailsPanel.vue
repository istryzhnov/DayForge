<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { DailyTask, MajorTaskOption } from '../../../entities/TaskEntity'
import type { ID } from '../../../entities/types'
import { PRIORITY } from '../../../entities/constants'
import { useFocusTrap } from '../../../composables/useFocusTrap'

const props = defineProps<{
  task: DailyTask
  projectOptions: MajorTaskOption[]
  /** Project this task currently sits under, if any. */
  currentProjectId: ID | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'unschedule', taskId: ID): void
  (
    e: 'update-time',
    payload: { taskId: ID; startTime: string; endTime: string },
  ): void
  (e: 'update-title', payload: { templateId: ID; title: string }): void
  (
    e: 'update-project',
    payload: { templateId: ID; projectTemplateId: ID | null },
  ): void
}>()

// Binds to the `ref="trapRef"` root element below.
useFocusTrap({ onEscape: () => emit('close') })

const title = ref(props.task.title)
const startTime = ref(props.task.startTime ?? '')
const endTime = ref(props.task.endTime ?? '')
const projectId = ref<ID | ''>(props.currentProjectId ?? '')

// A project groups other tasks, so it cannot itself be nested.
const canAttachToProject = computed(
  () => props.task.priority !== PRIORITY.MAJOR,
)

watch(
  () => props.task,
  (task) => {
    title.value = task.title
    startTime.value = task.startTime ?? ''
    endTime.value = task.endTime ?? ''
    projectId.value = props.currentProjectId ?? ''
  },
)

const isTimeValid = computed(
  () =>
    Boolean(startTime.value) &&
    Boolean(endTime.value) &&
    startTime.value < endTime.value,
)

function save() {
  const trimmed = title.value.trim()
  if (trimmed && trimmed !== props.task.title) {
    emit('update-title', { templateId: props.task.templateId, title: trimmed })
  }

  if (canAttachToProject.value && (projectId.value || '') !== (props.currentProjectId ?? '')) {
    emit('update-project', {
      templateId: props.task.templateId,
      projectTemplateId: projectId.value || null,
    })
  }

  if (!isTimeValid.value) return
  emit('update-time', {
    taskId: props.task.id,
    startTime: startTime.value,
    endTime: endTime.value,
  })
}
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

      <label v-if="canAttachToProject" class="event-details__field">
        <span class="event-details__label">Project</span>
        <select v-model="projectId">
          <option value="">No project</option>
          <option
            v-for="option in projectOptions"
            :key="option.id"
            :value="option.id"
          >
            {{ option.title }} ({{ option.goalTitle }})
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
