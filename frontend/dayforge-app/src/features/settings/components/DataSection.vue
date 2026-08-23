<script setup lang="ts">
import { computed } from 'vue'
import { useBackupFile } from '../composables/useBackupFile'

const props = defineProps<{
  stats: { goals: number; templates: number; rows: number; kilobytes: number }
}>()

const emit = defineEmits<{
  (e: 'export'): void
  (e: 'import', payload: unknown): void
  (e: 'clear'): void
  (e: 'open-starter'): void
}>()

const { message, clearMessage, pickFile, onFileChosen } = useBackupFile({
  onImport: (payload) => emit('import', payload),
})

const summary = computed(
  () =>
    `${props.stats.goals} projects · ${props.stats.templates} tasks · ${props.stats.rows} day rows`,
)

function clearEverything() {
  clearMessage()
  emit('clear')
}
</script>

<template>
  <div class="settings-section">
    <p class="settings-section__intro">
      Everything lives in this browser's local storage — nothing is sent
      anywhere. A backup file is the only copy that survives clearing site data
      or moving to another machine.
    </p>

    <div class="settings-stats">
      <strong>{{ summary }}</strong>
      <em>about {{ stats.kilobytes }} KB stored</em>
    </div>

    <button
      class="btn btn-primary settings-action"
      type="button"
      @click="emit('export')"
    >
      Export backup
    </button>

    <button
      class="btn btn-ghost settings-action"
      type="button"
      @click="pickFile"
    >
      Import backup…
    </button>
    <input
      ref="fileInput"
      class="settings-file"
      type="file"
      accept="application/json,.json"
      @change="onFileChosen"
    />
    <p class="settings-group-hint">
      Importing replaces the current projects and tasks. The undo toast can put
      them back if it was the wrong file.
    </p>

    <p v-if="message" class="settings-message" :class="`is-${message.tone}`">
      {{ message.text }}
    </p>

    <p class="sidebar-caption">Start over</p>

    <button
      class="btn btn-ghost settings-action"
      type="button"
      @click="emit('open-starter')"
    >
      Build a starter day again
    </button>
    <p class="settings-group-hint">
      Reopens the three onboarding questions, which otherwise only appear on a
      brand-new install.
    </p>

    <button
      class="btn btn-ghost settings-action settings-action--danger"
      type="button"
      @click="clearEverything"
    >
      Delete all projects and tasks
    </button>
    <p class="settings-group-hint">
      Reversible from the undo toast until it disappears — export first if you
      want a copy that lasts.
    </p>
  </div>
</template>
