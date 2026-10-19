<script setup lang="ts">
defineProps<{
  boardEnabled: boolean
  hasNotes: boolean
  notesOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'set-board', enabled: boolean): void
  (e: 'toggle-notes'): void
}>()

const VIEWS: ReadonlyArray<{ label: string; boardEnabled: boolean }> = [
  { label: 'List', boardEnabled: false },
  { label: 'Board', boardEnabled: true },
]
</script>

<template>
  <div class="project-toolbar">
    <div class="project-toolbar__segment" role="group" aria-label="Project view">
      <button
        v-for="view in VIEWS"
        :key="view.label"
        type="button"
        class="project-toolbar__btn"
        :class="{ 'is-active': boardEnabled === view.boardEnabled }"
        :aria-pressed="boardEnabled === view.boardEnabled"
        @click="emit('set-board', view.boardEnabled)"
      >
        {{ view.label }}
      </button>
    </div>

    <button
      type="button"
      class="project-toolbar__btn project-toolbar__notes"
      :class="{ 'is-active': notesOpen }"
      aria-haspopup="dialog"
      :aria-expanded="notesOpen"
      @click="emit('toggle-notes')"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <path d="M14 3v6h6M8 13h8M8 17h5" />
      </svg>
      <span>Notes</span>
      <span v-if="hasNotes" class="project-toolbar__dot" aria-hidden="true" />
    </button>
  </div>
</template>
