import { ref } from 'vue'
import type { ISODate } from '../../../entities/types'
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
  /** Set by the week view, where each column is a day; the day view omits it. */
  date?: ISODate
}

type DraftOptions = {
  /** The grid the day view draws on; a week column passes its own element. */
  getGridElement?: () => HTMLElement | null
  /** Touch devices tap to create; a press-drag there would fight page scrolling. */
  isCoarsePointer: () => boolean
  /** Lets the view veto a draft (e.g. the tap was only meant to close a menu). */
  canStartDraft?: () => boolean
  onCreate: (payload: CreateTaskPayload) => void
}

export function useCalendarDraft(options: DraftOptions) {
  const draftRange = ref<DraftRange | null>(null)
  const draftDate = ref<ISODate | null>(null)
  const showDraftForm = ref(false)
  const draftTitle = ref('')

  let isDrawing = false
  /** The grid the current press started on, so a drag keeps measuring it. */
  let drawGrid: HTMLElement | null = null

  function isActive() {
    return draftRange.value !== null
  }

  function openDraftAt(startMin: number, endMin: number, date?: ISODate) {
    draftRange.value = { startMin, endMin }
    draftDate.value = date ?? null
    draftTitle.value = ''
    showDraftForm.value = true
  }

  function cancelDraft() {
    draftRange.value = null
    draftDate.value = null
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
        date: draftDate.value ?? undefined,
      })
    }

    cancelDraft()
  }

  // --- mouse: press and drag to draw a range ------------------------------

  function onDrawMove(event: PointerEvent) {
    if (!isDrawing || !draftRange.value || !drawGrid) return

    const minutes = minutesFromClientY(drawGrid, event.clientY)
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

  /**
   * `grid` and `date` are for the week view, where every day column is its own
   * grid; the day view leaves them out and uses its single grid.
   */
  function onGridPointerDown(
    event: PointerEvent,
    grid: HTMLElement | null = options.getGridElement?.() ?? null,
    date?: ISODate,
  ) {
    // Only react to presses on bare grid background, never on an event block.
    if (!grid || event.target !== grid) return
    if (options.isCoarsePointer()) return
    if (options.canStartDraft && !options.canStartDraft()) return

    const startMin = minutesFromClientY(grid, event.clientY)
    isDrawing = true
    drawGrid = grid
    draftRange.value = {
      startMin,
      endMin: clampMinutes(startMin + defaultDurationMinutes()),
    }
    draftDate.value = date ?? null

    window.addEventListener('pointermove', onDrawMove)
    window.addEventListener('pointerup', onDrawEnd)
  }

  // --- touch: tap an empty slot ------------------------------------------

  function onGridTap(
    event: MouseEvent,
    grid: HTMLElement | null = options.getGridElement?.() ?? null,
    date?: ISODate,
  ) {
    if (!grid || event.target !== grid) return
    if (!options.isCoarsePointer()) return
    if (options.canStartDraft && !options.canStartDraft()) return
    if (isActive()) {
      cancelDraft()
      return
    }

    const startMin = minutesFromClientY(grid, event.clientY)
    openDraftAt(
      startMin,
      clampMinutes(startMin + defaultDurationMinutes()),
      date,
    )
  }

  return {
    draftRange,
    draftDate,
    showDraftForm,
    draftTitle,
    isActive,
    onGridPointerDown,
    onGridTap,
    submitDraft,
    cancelDraft,
  }
}
