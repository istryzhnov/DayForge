import { ref, useTemplateRef } from 'vue'
import { parseBackupFile } from './useDataTransfer'
import { i18n } from '../../../i18n'

export type BackupFileMessage = {
  text: string
  tone: 'ok' | 'warning' | 'error'
}

type BackupFileActions = {
  onImport: (payload: unknown) => void
  onRestoreSnapshot: (payload: unknown) => void
}

/**
 * A replacement of all the data, held until the user confirms it. Nothing is
 * replaced by choosing a file or a snapshot alone.
 */
export type PendingReplace = {
  kind: 'import' | 'snapshot'
  payload: unknown
  /** Shown once the replacement has happened. */
  notice: BackupFileMessage | null
}

export function useBackupFile(actions: BackupFileActions) {
  // Bound by name to `ref="fileInput"` in the template.
  const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
  const message = ref<BackupFileMessage | null>(null)
  const pending = ref<PendingReplace | null>(null)

  function clearMessage() {
    message.value = null
  }

  function pickFile() {
    clearMessage()
    pending.value = null
    fileInput.value?.click()
  }

  async function onFileChosen(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    // Cleared straight away so choosing the same file twice fires again.
    input.value = ''
    if (!file) return

    let parsed: unknown
    try {
      parsed = JSON.parse(await file.text())
    } catch {
      message.value = {
        text: i18n.global.t('settings.backupNotJson'),
        tone: 'error',
      }
      return
    }

    const backup = parseBackupFile(parsed)
    if (!backup) {
      message.value = {
        text: i18n.global.t('settings.backupNotDayforge'),
        tone: 'error',
      }
      return
    }

    // The notice is written now, in the language in force at the time of choosing.
    pending.value = {
      kind: 'import',
      payload: parsed,
      notice: backup.newerVersion
        ? {
            text: i18n.global.t('settings.backupImportedNewer', {
              name: file.name,
            }),
            tone: 'warning',
          }
        : {
            text: i18n.global.t('settings.backupImported', {
              name: file.name,
            }),
            tone: 'ok',
          },
    }
  }

  function askRestoreSnapshot(payload: unknown) {
    clearMessage()
    pending.value = { kind: 'snapshot', payload, notice: null }
  }

  function confirmReplace() {
    const next = pending.value
    pending.value = null
    if (!next) return

    if (next.kind === 'import') actions.onImport(next.payload)
    else actions.onRestoreSnapshot(next.payload)
    message.value = next.notice
  }

  function cancelReplace() {
    pending.value = null
  }

  return {
    message,
    clearMessage,
    pickFile,
    onFileChosen,
    pending,
    askRestoreSnapshot,
    confirmReplace,
    cancelReplace,
  }
}
