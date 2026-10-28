<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppIcon from '../../../components/AppIcon.vue'

defineProps<{
  boardEnabled: boolean
  hasNotes: boolean
  notesOpen: boolean
}>()

const { t } = useI18n()

const emit = defineEmits<{
  (e: 'set-board', enabled: boolean): void
  (e: 'toggle-notes'): void
}>()

const VIEWS: ReadonlyArray<{ labelKey: string; boardEnabled: boolean }> = [
  { labelKey: 'goals.viewList', boardEnabled: false },
  { labelKey: 'goals.viewBoard', boardEnabled: true },
]
</script>

<template>
  <div class="project-toolbar">
    <div class="ui-tabs" role="group" :aria-label="t('goals.projectView')">
      <button
        v-for="view in VIEWS"
        :key="view.labelKey"
        type="button"
        class="ui-tab"
        :class="{ 'is-active': boardEnabled === view.boardEnabled }"
        :aria-pressed="boardEnabled === view.boardEnabled"
        :data-tip-anchor="view.boardEnabled ? 'board-tab' : 'list-tab'"
        @click="emit('set-board', view.boardEnabled)"
      >
        {{ t(view.labelKey) }}
      </button>
    </div>

    <button
      type="button"
      class="ui-icon-btn ui-icon-btn--outlined project-toolbar__notes"
      :class="{ 'is-active': notesOpen }"
      :aria-label="t('goals.projectNotes')"
      :title="t('goals.projectNotes')"
      aria-haspopup="dialog"
      :aria-expanded="notesOpen"
      @click="emit('toggle-notes')"
    >
      <AppIcon name="file-text" :size="16" />
      <span v-if="hasNotes" class="project-toolbar__dot" aria-hidden="true" />
    </button>
  </div>
</template>
