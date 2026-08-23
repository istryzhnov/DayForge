import { ref, useTemplateRef } from 'vue'
import { parseBackupFile } from './useDataTransfer'

/**
 * Choosing a backup file and deciding whether it is one.
 *
 * The file is validated *before* it is handed on, so a wrong pick never reaches
 * the store and the message can say precisely what was wrong with it: not JSON
 * at all, or JSON that isn't a DayForge backup.
 */

export type BackupFileMessage = {
  text: string
  tone: 'ok' | 'error'
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
      message.value = { text: 'That file is not valid JSON.', tone: 'error' }
      return
    }

    if (!parseBackupFile(parsed)) {
      message.value = {
        text: 'That JSON is not a DayForge backup.',
        tone: 'error',
      }
      return
    }

    actions.onImport(parsed)
    message.value = { text: `Imported ${file.name}.`, tone: 'ok' }
  }

  return { message, clearMessage, pickFile, onFileChosen }
}
