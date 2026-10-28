<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { TimeEntry } from '../../../entities/TimerEntity'
import { useFocusTrap } from '../../../composables/useFocusTrap'
import { useTimeEntryEditor } from '../composables/useTimeEntryEditor'

const props = defineProps<{ entry: TimeEntry | null }>()

const emit = defineEmits<{ (e: 'saved'): void; (e: 'close'): void }>()

const { t } = useI18n()

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
      <h3>{{ entry ? t('timer.editEntry') : t('timer.addEntryTitle') }}</h3>

      <label class="timer-field">
        {{ t('timer.startedField') }}
        <input v-model="form.startedAt" type="datetime-local" />
      </label>

      <label class="timer-field">
        {{ t('timer.endedField') }}
        <input v-model="form.endedAt" type="datetime-local" />
      </label>

      <label class="timer-field">
        {{ t('timer.taskField') }}
        <input
          v-model="form.taskTitle"
          type="text"
          :placeholder="t('timer.taskEntryPlaceholder')"
        />
      </label>

      <label class="timer-field">
        {{ t('timer.noteField') }}
        <input
          v-model="form.note"
          type="text"
          :placeholder="t('timer.notePlaceholder')"
        />
      </label>

      <p
        v-for="issue in issues.errors"
        :key="issue.key"
        class="timer-issue is-error"
      >
        {{ t(issue.key, issue.params ?? {}) }}
      </p>
      <p
        v-for="issue in issues.warnings"
        :key="issue.key"
        class="timer-issue is-warning"
      >
        {{ t(issue.key, issue.params ?? {}) }}
      </p>

      <div class="modal-actions">
        <button class="btn btn-ghost" type="button" @click="emit('close')">
          {{ t('timer.cancel') }}
        </button>
        <button
          class="btn btn-primary"
          type="button"
          :disabled="!canSave"
          @click="submit"
        >
          {{ t('timer.save') }}
        </button>
      </div>
    </div>
  </div>
</template>
