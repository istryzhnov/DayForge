<script setup lang="ts">
import { onMounted, useTemplateRef, type StyleValue } from 'vue'
import type { ID } from '../../../entities/types'
import { NOTES_MAX_LENGTH } from '../../../composables/goalSpace/notes'
import { useFocusTrap } from '../../../composables/useFocusTrap'
import { useTextareaFit } from '../../../composables/useNotesDraft'
import { useProjectNotes } from '../composables/useProjectNotes'

const props = defineProps<{
  goalId: ID
  title: string
  notes: string
  themeStyle?: StyleValue
}>()

const emit = defineEmits<{
  (e: 'save', goalId: ID, notes: string): void
  (e: 'close'): void
}>()

// Escape closes the pad but keeps the text: the draft is saved on the way out.
useFocusTrap({ onEscape: () => emit('close') })

// Captured now, so a save flushed during unmount still lands on this project
// even if the parent has already moved on to another one.
const goalId = props.goalId
const { draft, flush } = useProjectNotes(
  () => props.notes,
  (notes) => emit('save', goalId, notes),
)

const textareaRef = useTemplateRef<HTMLTextAreaElement>('textareaRef')
useTextareaFit(textareaRef, draft)

onMounted(() => {
  // Focus the text on desktop only; on a phone it would open the keyboard.
  if (window.matchMedia('(max-width: 720px)').matches) return
  textareaRef.value?.focus()
})
</script>

<template>
  <Teleport to="body">
    <div class="project-notes-layer">
      <div class="project-notes-layer__scrim" @click="emit('close')" />
      <aside
        ref="trapRef"
        class="project-notes"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-notes-title"
        :style="themeStyle"
      >
        <header class="project-notes__head">
          <h3 id="project-notes-title">Notes · {{ title }}</h3>
          <button
            type="button"
            class="project-notes__close"
            aria-label="Close notes"
            @click="emit('close')"
          >
            ×
          </button>
        </header>

        <textarea
          ref="textareaRef"
          v-model="draft"
          class="project-notes__text"
          aria-label="Project notes"
          placeholder="Ideas, links, anything about this project…"
          :maxlength="NOTES_MAX_LENGTH"
          @blur="flush"
        />

        <p class="project-notes__hint">Saved automatically</p>
      </aside>
    </div>
  </Teleport>
</template>
