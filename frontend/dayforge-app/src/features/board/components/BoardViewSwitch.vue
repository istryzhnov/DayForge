<script setup lang="ts">
import { PROJECT_VIEW, type ProjectView } from '../composables/boardViews'

defineProps<{ view: ProjectView }>()

const emit = defineEmits<{
  (e: 'select', view: ProjectView): void
}>()

const OPTIONS: ReadonlyArray<{ key: ProjectView; label: string }> = [
  { key: PROJECT_VIEW.LIST, label: 'List' },
  { key: PROJECT_VIEW.BOARD, label: 'Board' },
]
</script>

<template>
  <div class="board-view-switch" role="group" aria-label="Project view">
    <button
      v-for="option in OPTIONS"
      :key="option.key"
      type="button"
      class="board-view-switch__btn"
      :class="{ 'is-active': view === option.key }"
      :aria-pressed="view === option.key"
      @click="emit('select', option.key)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
