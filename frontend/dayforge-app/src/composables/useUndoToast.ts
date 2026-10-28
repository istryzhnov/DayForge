import { computed, ref } from 'vue'
import { i18n } from '../i18n'
import { useSettings } from './useSettings'

const undoWindowMs = computed(
  () => useSettings().settings.behavior.undoWindowSeconds * 1000,
)

/** One button of a message. */
export interface ToastAction {
  label: string
  run: () => void
}

/**
 * One message at a time. Most are "Undo"; a notice can name its own action
 * instead, such as "Show" after scheduling a task elsewhere. A message may also
 * carry secondary buttons and stay up until the user answers it.
 */
type PendingAction = {
  id: number
  label: string
  actionLabel: string
  run: () => void
  secondary: ToastAction[]
  sticky: boolean
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
  function show(
    label: string,
    actionLabel: string,
    run: () => void,
    secondary: ToastAction[] = [],
    sticky = false,
  ) {
    clearTimer()
    nextId += 1
    pending.value = { id: nextId, label, actionLabel, run, secondary, sticky }

    if (sticky) return

    const offeredId = nextId
    timerId = window.setTimeout(() => {
      if (pending.value?.id === offeredId) pending.value = null
      timerId = undefined
    }, undoWindowMs.value)
  }

  function offerUndo(label: string, restore: () => void) {
    show(label, i18n.global.t('common.undo'), restore)
  }

  function offerNotice(label: string, actionLabel: string, run: () => void) {
    show(label, actionLabel, run)
  }

  /**
   * The first action is the main button; the rest sit beside it. A sticky
   * message waits for an answer instead of fading out.
   */
  function offerChoices(
    label: string,
    actions: ToastAction[],
    options: { sticky?: boolean } = {},
  ) {
    const [primary, ...secondary] = actions
    if (!primary) return
    show(label, primary.label, primary.run, secondary, options.sticky ?? false)
  }

  /** Index 0 is the main button, 1 onwards the secondary ones in order. */
  function runPendingAction(index = 0) {
    const current = pending.value
    clearTimer()
    pending.value = null
    if (!current) return

    const action: ToastAction | undefined =
      index === 0
        ? { label: current.actionLabel, run: current.run }
        : current.secondary[index - 1]
    action?.run()
  }

  function dismissUndo() {
    clearTimer()
    pending.value = null
  }

  return {
    pending,
    offerUndo,
    offerNotice,
    offerChoices,
    runPendingAction,
    dismissUndo,
    undoWindowMs,
  }
}
