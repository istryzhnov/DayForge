import { ref, useTemplateRef } from 'vue'
import { parseBackupFile } from './useDataTransfer'
import { i18n } from '../../../i18n'

export type BackupFileMessage = {
  text: string
  tone: 'ok' | 'warning' | 'error'
}

type BackupFileActions = {
  onImport: (payload: unknown) => void
}

export function useBackupFile(actions: BackupFileActions) {
  // Bound by name to `ref="fileInput"` in the template.
  const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
  const message = ref<BackupFileMessage | null>(null)

  function clearMessage() {
    message.value = null
  }

  function pickFile() {
    clearMessage()
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

    actions.onImport(parsed)
    // A notice is written once, in the language in force at the time of import.
    message.value = backup.newerVersion
      ? {
          text: i18n.global.t('settings.backupImportedNewer', {
            name: file.name,
          }),
          tone: 'warning',
        }
      : {
          text: i18n.global.t('settings.backupImported', { name: file.name }),
          tone: 'ok',
        }
  }

  return { message, clearMessage, pickFile, onFileChosen }
}
