import { ref } from 'vue'
import {
  defaultDurationMinutes,
  snapStepMinutes,
  clampMinutes,
  minutesFromClientY,
  timeFromMinutes,
} from './useCalendarGrid'

export type DraftRange = { startMin: number; endMin: number }

export type CreateTaskPayload = {
  title: string
  startTime: string
  endTime: string
}

type DraftOptions = {
  getGridElement: () => HTMLElement | null
  /** Touch devices tap to create; a press-drag there would fight page scrolling. */
  isCoarsePointer: () => boolean
  /** Lets the view veto a draft (e.g. the tap was only meant to close a menu). */
  canStartDraft?: () => boolean
  onCreate: (payload: CreateTaskPayload) => void
}

export function useCalendarDraft(options: DraftOptions) {
  const draftRange = ref<DraftRange | null>(null)
  const showDraftForm = ref(false)
  const draftTitle = ref('')

  let isDrawing = false

  function isActive() {
    return draftRange.value !== null
  }

  function openDraftAt(startMin: number, endMin: number) {
    draftRange.value = { startMin, endMin }
    draftTitle.value = ''
    showDraftForm.value = true
  }

  function cancelDraft() {
    draftRange.value = null
    showDraftForm.value = false
    draftTitle.value = ''
    isDrawing = false
  }

  function submitDraft() {
    const range = draftRange.value
    const title = draftTitle.value.trim()

    if (range && title) {
      options.onCreate({
        title,
        startTime: timeFromMinutes(range.startMin),
        endTime: timeFromMinutes(range.endMin),
      })
    }

    cancelDraft()
  }

  // --- mouse: press and drag to draw a range ------------------------------

  function onDrawMove(event: PointerEvent) {
    const grid = options.getGridElement()
    if (!isDrawing || !draftRange.value || !grid) return

    const minutes = minutesFromClientY(grid, event.clientY)
    draftRange.value.endMin = Math.max(
      minutes,
      draftRange.value.startMin + snapStepMinutes(),
    )
  }

  function onDrawEnd() {
    window.removeEventListener('pointermove', onDrawMove)
    window.removeEventListener('pointerup', onDrawEnd)
    isDrawing = false
    if (draftRange.value) showDraftForm.value = true
  }

  function onGridPointerDown(event: PointerEvent) {
    const grid = options.getGridElement()
    // Only react to presses on bare grid background, never on an event block.
    if (!grid || event.target !== grid) return
    if (options.isCoarsePointer()) return
    if (options.canStartDraft && !options.canStartDraft()) return

    const startMin = minutesFromClientY(grid, event.clientY)
    isDrawing = true
    draftRange.value = {
      startMin,
      endMin: clampMinutes(startMin + defaultDurationMinutes()),
    }

    window.addEventListener('pointermove', onDrawMove)
    window.addEventListener('pointerup', onDrawEnd)
  }

  // --- touch: tap an empty slot ------------------------------------------

  function onGridTap(event: MouseEvent) {
    const grid = options.getGridElement()
    if (!grid || event.target !== grid) return
    if (!options.isCoarsePointer()) return
    if (options.canStartDraft && !options.canStartDraft()) return
    if (isActive()) {
      cancelDraft()
      return
    }

    const startMin = minutesFromClientY(grid, event.clientY)
    openDraftAt(startMin, clampMinutes(startMin + defaultDurationMinutes()))
  }

  return {
    draftRange,
    showDraftForm,
    draftTitle,
    isActive,
    onGridPointerDown,
    onGridTap,
    submitDraft,
    cancelDraft,
  }
}
