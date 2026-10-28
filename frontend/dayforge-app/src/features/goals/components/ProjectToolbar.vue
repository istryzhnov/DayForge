<script setup lang="ts">
import AppIcon from '../../../components/AppIcon.vue'

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
    <div class="ui-tabs" role="group" aria-label="Project view">
      <button
        v-for="view in VIEWS"
        :key="view.label"
        type="button"
        class="ui-tab"
        :class="{ 'is-active': boardEnabled === view.boardEnabled }"
        :aria-pressed="boardEnabled === view.boardEnabled"
        :data-tip-anchor="view.boardEnabled ? 'board-tab' : 'list-tab'"
        @click="emit('set-board', view.boardEnabled)"
      >
        {{ view.label }}
      </button>
    </div>

    <button
      type="button"
      class="ui-icon-btn ui-icon-btn--outlined project-toolbar__notes"
      :class="{ 'is-active': notesOpen }"
      aria-label="Project notes"
      title="Project notes"
      aria-haspopup="dialog"
      :aria-expanded="notesOpen"
      @click="emit('toggle-notes')"
    >
      <AppIcon name="file-text" :size="16" />
      <span v-if="hasNotes" class="project-toolbar__dot" aria-hidden="true" />
    </button>
  </div>
</template>
