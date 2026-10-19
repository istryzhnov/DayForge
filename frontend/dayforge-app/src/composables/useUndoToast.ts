import { computed, ref } from 'vue'
import { useSettings } from './useSettings'

const undoWindowMs = computed(
  () => useSettings().settings.behavior.undoWindowSeconds * 1000,
)

/**
 * One message at a time, with a single action. Most are "Undo"; a notice can
 * name its own action instead, such as "Show" after scheduling a task elsewhere.
 */
type PendingAction = {
  id: number
  label: string
  actionLabel: string
  run: () => void
}

const pending = ref<PendingAction | null>(null)
let timerId: number | undefined
let nextId = 0

function clearTimer() {
  if (timerId !== undefined) {
    window.clearTimeout(timerId)
    timerId = undefined
  }
}

export function useUndoToast() {
  function show(label: string, actionLabel: string, run: () => void) {
    clearTimer()
    nextId += 1
    pending.value = { id: nextId, label, actionLabel, run }

    const offeredId = nextId
    timerId = window.setTimeout(() => {
      if (pending.value?.id === offeredId) pending.value = null
      timerId = undefined
    }, undoWindowMs.value)
  }

  function offerUndo(label: string, restore: () => void) {
    show(label, 'Undo', restore)
  }

  function offerNotice(label: string, actionLabel: string, run: () => void) {
    show(label, actionLabel, run)
  }

  function runPendingAction() {
    const current = pending.value
    clearTimer()
    pending.value = null
    current?.run()
  }

  function dismissUndo() {
    clearTimer()
    pending.value = null
  }

  return {
    pending,
    offerUndo,
    offerNotice,
    runPendingAction,
    dismissUndo,
    undoWindowMs,
  }
}
