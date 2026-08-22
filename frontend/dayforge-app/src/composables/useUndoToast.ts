import { ref } from 'vue'

/** How long a destructive action stays reversible. */
const UNDO_WINDOW_MS = 9000

type PendingUndo = {
  id: number
  label: string
  restore: () => void
}

// Module-level so any composable can offer an undo and a single toast anywhere
// in the app renders it — the same singleton pattern as useTaskNotifications.
const pending = ref<PendingUndo | null>(null)
let timerId: number | undefined
let nextId = 0

function clearTimer() {
  if (timerId !== undefined) {
    window.clearTimeout(timerId)
    timerId = undefined
  }
}

export function useUndoToast() {
  /**
   * Offer to reverse something that just happened. Only one offer is live at a
   * time; a second action supersedes the first rather than queueing, so the
   * button always undoes what the user just did.
   */
  function offerUndo(label: string, restore: () => void) {
    clearTimer()
    nextId += 1
    pending.value = { id: nextId, label, restore }

    const offeredId = nextId
    timerId = window.setTimeout(() => {
      if (pending.value?.id === offeredId) pending.value = null
      timerId = undefined
    }, UNDO_WINDOW_MS)
  }

  function performUndo() {
    const current = pending.value
    clearTimer()
    pending.value = null
    current?.restore()
  }

  function dismissUndo() {
    clearTimer()
    pending.value = null
  }

  return { pending, offerUndo, performUndo, dismissUndo, undoWindowMs: UNDO_WINDOW_MS }
}
