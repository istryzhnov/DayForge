<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useBackupFile } from '../composables/useBackupFile'
import { useAuth } from '../../../composables/useAuth'
import { useSync } from '../../../composables/useSync'
import { useFormat } from '../../../composables/useFormat'
import type { SnapshotRecord } from '../../../sync/snapshots'

const props = defineProps<{
  stats: { goals: number; templates: number; rows: number; kilobytes: number }
}>()

const emit = defineEmits<{
  (e: 'export'): void
  (e: 'import', payload: unknown): void
  (e: 'restore-snapshot', payload: unknown): void
  (e: 'clear'): void
  (e: 'open-starter'): void
}>()

const { message, clearMessage, pickFile, onFileChosen } = useBackupFile({
  onImport: (payload) => emit('import', payload),
})

const auth = useAuth()
const sync = useSync()
const { locale, uses12Hour } = useFormat()

const summary = computed(
  () =>
    `${props.stats.goals} projects · ${props.stats.templates} tasks · ${props.stats.rows} day rows`,
)

const snapshots = ref<SnapshotRecord[]>([])

async function loadSnapshots() {
  snapshots.value = await sync.snapshots.list()
}

onMounted(loadSnapshots)

function formatWhen(at: string) {
  return new Date(at).toLocaleString(locale.value, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: uses12Hour.value,
  })
}

function restore(record: SnapshotRecord) {
  clearMessage()
  emit('restore-snapshot', record.payload)
}

function clearEverything() {
  clearMessage()
  emit('clear')
}
</script>

<template>
  <div class="settings-section">
    <p v-if="auth.isSignedIn.value" class="settings-section__intro">
      This browser holds a full copy of everything, and so does your account —
      the two keep themselves in step on their own. A backup file is still the
      only copy that survives both.
    </p>
    <p v-else class="settings-section__intro">
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

    <template v-if="snapshots.length > 0">
      <p class="sidebar-caption">Automatic snapshots</p>
      <p class="settings-group-hint">
        Taken by itself just before your data was first merged with an account,
        so there is always a way back if the result was not what you expected.
        The three most recent are kept.
      </p>

      <div class="snapshot-list">
        <div
          v-for="record in snapshots"
          :key="record.id"
          class="snapshot-row"
        >
          <span class="snapshot-row__text">
            <strong>{{ formatWhen(record.createdAt) }}</strong>
            <em>{{ record.reason }}</em>
          </span>
          <button class="btn btn-ghost" type="button" @click="restore(record)">
            Restore
          </button>
        </div>
      </div>
      <p class="settings-group-hint">
        Restoring works like importing a file: the undo toast can take it back.
      </p>
    </template>

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
      <template v-if="auth.isSignedIn.value">
        It clears your account too, on every device.
      </template>
    </p>

    <p class="settings-group-hint legal-links">
      <a href="/terms.html" target="_blank" rel="noopener">Terms of Service</a>
      ·
      <a href="/privacy.html" target="_blank" rel="noopener">Privacy Policy</a>
    </p>
  </div>
</template>
