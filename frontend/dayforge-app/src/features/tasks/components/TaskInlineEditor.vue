<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue'
import type { TaskSchedule } from '../../../entities/TaskEntity'
import type { TaskNode } from '../../../composables/useTaskTree'
import {
  isCommitShortcut,
  useNotesDraft,
  useTextareaFit,
} from '../../../composables/useNotesDraft'
import TaskScheduleFields from './TaskScheduleFields.vue'

const props = defineProps<{
  node: TaskNode
  /** Opening straight from "Add to calendar" turns scheduling on right away. */
  openScheduled?: boolean
}>()

const emit = defineEmits<{
  (
    e: 'save',
    payload: { title: string; schedule: TaskSchedule | null },
  ): void
  (e: 'save-notes', notes: string): void
  (e: 'close'): void
}>()

const scheduleFields =
  useTemplateRef<InstanceType<typeof TaskScheduleFields>>('scheduleFields')

const title = ref(props.node.task.title)
const titleInput = useTemplateRef<HTMLInputElement>('titleInput')
const notesInput = useTemplateRef<HTMLTextAreaElement>('notesInput')

const {
  draft: notes,
  commit: commitNotes,
  revert: revertNotes,
} = useNotesDraft(
  () => props.node.template?.notes ?? '',
  (next) => emit('save-notes', next),
)
useTextareaFit(notesInput, notes)

const wasScheduled = Boolean(props.node.task.startTime)

const saveLabel = computed(() =>
  scheduleFields.value?.isEnabled && !wasScheduled ? 'Add to calendar' : 'Save',
)

onMounted(() => {
  scheduleFields.value?.load(
    {
      startTime: props.node.task.startTime,
      endTime: props.node.task.endTime,
      recurrence: props.node.template?.recurrence,
    },
    { enable: props.openScheduled },
  )
  titleInput.value?.focus()
})

/** Esc drops an unsaved note; the editor's own Esc then closes it as before. */
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

function save() {
  const trimmed = title.value.trim()
  if (!trimmed) return
  if (scheduleFields.value?.isEnabled && !scheduleFields.value?.isValid) return

  emit('save', {
    title: trimmed,
    schedule: scheduleFields.value?.buildSchedule() ?? null,
  })
  emit('close')
}
</script>

<template>
  <div class="task-editor" @keydown.esc="emit('close')">
    <label class="task-editor__field">
      <span class="task-schedule__label">Task</span>
      <input
        ref="titleInput"
        v-model="title"
        type="text"
        @keydown.enter="save"
      />
    </label>

    <label class="task-editor__field">
      <span class="task-schedule__label">Notes</span>
      <textarea
        ref="notesInput"
        v-model="notes"
        rows="2"
        maxlength="5000"
        placeholder="Add notes"
        @blur="commitNotes"
        @keydown="onNotesKeydown"
      ></textarea>
    </label>

    <TaskScheduleFields ref="scheduleFields" />

    <div class="task-editor__actions">
      <button class="btn btn-ghost" type="button" @click="emit('close')">
        Cancel
      </button>
      <button
        class="btn btn-primary"
        type="button"
        :disabled="!title.trim()"
        @click="save"
      >
        {{ saveLabel }}
      </button>
    </div>
  </div>
</template>
