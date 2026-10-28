<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBackupFile } from '../composables/useBackupFile'
import DeleteAccountDialog from '../../profile/components/DeleteAccountDialog.vue'
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

const { t } = useI18n()

const summary = computed(() =>
  t('settings.dataSummary', {
    projects: props.stats.goals,
    tasks: props.stats.templates,
    rows: props.stats.rows,
  }),
)

const snapshots = ref<SnapshotRecord[]>([])
const isDeleteAccountOpen = ref(false)

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
      {{ t('settings.dataIntroSignedIn') }}
    </p>
    <p v-else class="settings-section__intro">
      {{ t('settings.dataIntroLocal') }}
    </p>

    <div class="settings-stats ui-card">
      <strong>{{ summary }}</strong>
      <em>{{ t('settings.dataKilobytes', { kb: stats.kilobytes }) }}</em>
    </div>

    <button
      class="btn btn-primary settings-action"
      type="button"
      @click="emit('export')"
    >
      {{ t('settings.dataExport') }}
    </button>

    <button
      class="btn btn-ghost settings-action"
      type="button"
      @click="pickFile"
    >
      {{ t('settings.dataImport') }}
    </button>
    <input
      ref="fileInput"
      class="settings-file"
      type="file"
      accept="application/json,.json"
      @change="onFileChosen"
    />
    <p class="settings-group-hint">
      {{ t('settings.dataImportNote') }}
    </p>

    <p v-if="message" class="settings-message" :class="`is-${message.tone}`">
      {{ message.text }}
    </p>

    <template v-if="snapshots.length > 0">
      <p class="ui-section-label ui-section-label--wrap">
        {{ t('settings.dataSnapshotsCaption') }}
      </p>
      <p class="settings-group-hint">
        {{ t('settings.dataSnapshotsNote') }}
      </p>

      <div class="snapshot-list">
        <div v-for="record in snapshots" :key="record.id" class="snapshot-row">
          <span class="snapshot-row__text">
            <strong>{{ formatWhen(record.createdAt) }}</strong>
            <em>{{ record.reason }}</em>
          </span>
          <button class="btn btn-ghost" type="button" @click="restore(record)">
            {{ t('settings.dataRestore') }}
          </button>
        </div>
      </div>
      <p class="settings-group-hint">
        {{ t('settings.dataRestoreNote') }}
      </p>
    </template>

    <p class="ui-section-label ui-section-label--wrap">
      {{ t('settings.dataStartOverCaption') }}
    </p>

    <button
      class="btn btn-ghost settings-action"
      type="button"
      @click="emit('open-starter')"
    >
      {{ t('settings.dataStarterAgain') }}
    </button>
    <p class="settings-group-hint">
      {{ t('settings.dataStarterNote') }}
    </p>

    <button
      class="btn btn-ghost settings-action settings-action--danger"
      type="button"
      @click="clearEverything"
    >
      {{ t('settings.dataClearAll') }}
    </button>
    <p class="settings-group-hint">
      {{ t('settings.dataClearNote') }}
      <template v-if="auth.isSignedIn.value">
        {{ t('settings.dataClearSignedIn') }}
      </template>
      <template v-else>
        {{ t('settings.dataClearLocal') }}
      </template>
    </p>

    <template v-if="auth.isSignedIn.value">
      <p class="ui-section-label ui-section-label--wrap">
        {{ t('settings.dataAccountCaption') }}
      </p>

      <button
        class="btn btn-ghost settings-action settings-action--danger"
        type="button"
        :disabled="!sync.isOnline.value"
        @click="isDeleteAccountOpen = true"
      >
        {{ t('settings.dataDeleteAccount') }}
      </button>
      <p v-if="!sync.isOnline.value" class="settings-group-hint">
        {{ t('profile.offlineDelete') }}
      </p>
      <p v-else class="settings-group-hint">
        {{ t('settings.dataDeleteAccountNote') }}
      </p>

      <DeleteAccountDialog
        v-if="isDeleteAccountOpen"
        @close="isDeleteAccountOpen = false"
        @export-backup="emit('export')"
      />
    </template>

    <p class="settings-group-hint legal-links">
      <a href="/terms.html" target="_blank" rel="noopener">{{
        t('settings.dataTerms')
      }}</a>
      ·
      <a href="/privacy.html" target="_blank" rel="noopener">{{
        t('settings.dataPrivacy')
      }}</a>
    </p>
  </div>
</template>
