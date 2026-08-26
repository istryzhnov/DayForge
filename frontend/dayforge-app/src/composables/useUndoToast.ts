import { computed, ref } from 'vue'
import { useSettings } from './useSettings'

const undoWindowMs = computed(
  () => useSettings().settings.behavior.undoWindowSeconds * 1000,
)

type PendingUndo = {
  id: number
  label: string
  restore: () => void
}

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
  function offerUndo(label: string, restore: () => void) {
    clearTimer()
    nextId += 1
    pending.value = { id: nextId, label, restore }

    const offeredId = nextId
    timerId = window.setTimeout(() => {
      if (pending.value?.id === offeredId) pending.value = null
      timerId = undefined
    }, undoWindowMs.value)
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

  return {
    pending,
    offerUndo,
    performUndo,
    dismissUndo,
    undoWindowMs,
  }
}
