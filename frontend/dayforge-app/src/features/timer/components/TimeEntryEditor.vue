<script setup lang="ts">
import type { TimeEntry } from '../../../entities/TimerEntity'
import { useFocusTrap } from '../../../composables/useFocusTrap'
import { useTimeEntryEditor } from '../composables/useTimeEntryEditor'

const props = defineProps<{ entry: TimeEntry | null }>()

const emit = defineEmits<{ (e: 'saved'): void; (e: 'close'): void }>()

useFocusTrap({ onEscape: () => emit('close') })

const { form, issues, canSave, save } = useTimeEntryEditor(props.entry)

function submit() {
  if (save()) emit('saved')
}
</script>

<template>
  <div class="new-goal-modal" @click.self="emit('close')">
    <div class="modal-overlay" @click="emit('close')"></div>
    <div ref="trapRef" class="modal-card" role="dialog" aria-modal="true">
      <h3>{{ entry ? 'Edit entry' : 'Add an entry' }}</h3>

      <label class="timer-field">
        Started
        <input v-model="form.startedAt" type="datetime-local" />
      </label>

      <label class="timer-field">
        Ended
        <input v-model="form.endedAt" type="datetime-local" />
      </label>

      <label class="timer-field">
        Task
        <input
          v-model="form.taskTitle"
          type="text"
          placeholder="What it went into"
        />
      </label>

      <label class="timer-field">
        Note
        <input v-model="form.note" type="text" placeholder="Optional" />
      </label>

      <p
        v-for="error in issues.errors"
        :key="error"
        class="timer-issue is-error"
      >
        {{ error }}
      </p>
      <p
        v-for="warning in issues.warnings"
        :key="warning"
        class="timer-issue is-warning"
      >
        {{ warning }}
      </p>

      <div class="modal-actions">
        <button class="btn btn-ghost" type="button" @click="emit('close')">
          Cancel
        </button>
        <button
          class="btn btn-primary"
          type="button"
          :disabled="!canSave"
          @click="submit"
        >
          Save
        </button>
      </div>
    </div>
  </div>
</template>
