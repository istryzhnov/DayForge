<script setup lang="ts">
import { computed, nextTick, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import TaskNotesPopover from './TaskNotesPopover.vue'
import { useNotesPopoverSlot } from '../composables/useNotesPopover'

const props = defineProps<{
  /** The task's saved notes; empty or absent means there are none yet. */
  notes?: string
  /** Named in the popover header. */
  title: string
}>()

const emit = defineEmits<{
  (e: 'save', notes: string): void
  /** The popover went away, so the parent can hide a button with no notes. */
  (e: 'close'): void
}>()

const { t } = useI18n()
const { isOpen, open, release } = useNotesPopoverSlot()
const button = useTemplateRef<HTMLButtonElement>('button')
const popover = useTemplateRef<InstanceType<typeof TaskNotesPopover>>('popover')

const hasNotes = computed(() => !!props.notes?.trim())
const label = computed(() =>
  hasNotes.value ? t('tasks.notesHasText') : t('tasks.addNotes'),
)

function onClick() {
  if (isOpen.value) {
    popover.value?.commitAndClose(true)
    return
  }
  openPopover()
}

/** Opens the popover from outside, e.g. "Add note" in the row's menu. */
function openPopover() {
  if (!isOpen.value) open()
}

function onClose(returnFocus: boolean) {
  release()
  emit('close')
  if (!returnFocus) return
  nextTick(() => button.value?.focus())
}

defineExpose({ openPopover })
</script>

<template>
  <button
    ref="button"
    type="button"
    class="task-notes-action"
    :class="{ 'has-notes': hasNotes, 'is-open': isOpen }"
    :aria-label="label"
    :aria-expanded="isOpen"
    aria-haspopup="dialog"
    :title="label"
    @pointerdown.stop
    @click.stop="onClick"
  >
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M3.5 2.5h6l3 3v8h-9z M9.5 2.5v3h3 M5.5 8.5h5 M5.5 11h3"
        fill="none"
        stroke="currentColor"
        stroke-width="1.4"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
    </svg>
  </button>

  <TaskNotesPopover
    v-if="isOpen"
    ref="popover"
    :title="title"
    :notes="notes"
    :anchor="button"
    @save="(next) => emit('save', next)"
    @close="onClose"
  />
</template>
