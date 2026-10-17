import { onUnmounted, ref } from 'vue'
import type { ID } from '../../../entities/types'
import type { GesturePoint } from '../../../composables/usePressGesture'
import { isBoardColumn, type BoardColumn } from './boardModel'

const DRAG_THRESHOLD_PX = 6
/** Controls inside a card keep their own clicks and never start a drag. */
const CONTROL_SELECTOR = 'select, input, textarea, a'

export type BoardCardDrag = {
  /** Mouse: the button goes down and a few pixels of travel start the drag. */
  startWithMouse: (event: PointerEvent) => void
  /** Touch: the card has been held long enough to be picked up. */
  begin: (point: GesturePoint) => void
  move: (point: GesturePoint) => void
  drop: () => void
  cancel: () => void
}

/**
 * Dragging a card between board columns. Mouse drags start at once; a finger
 * has to hold the card first (see `usePressGesture` in `BoardCard.vue`), so a
 * sideways swipe still scrolls the columns.
 */
export function useBoardDrag(
  onMove: (cardId: ID, column: BoardColumn) => void,
) {
  const draggingId = ref<ID | null>(null)
  const dropColumn = ref<BoardColumn | null>(null)
  /** Set after a real drag so the click that ends it does not open the card. */
  let justDragged = false

  let candidate: ID | null = null
  let origin: GesturePoint = { x: 0, y: 0 }

  function columnAt(point: GesturePoint): BoardColumn | null {
    const element = document.elementFromPoint(point.x, point.y)
    const value = element?.closest<HTMLElement>('[data-board-column]')?.dataset
      .boardColumn
    return isBoardColumn(value) ? value : null
  }

  function stopListening() {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', cancel)
    window.removeEventListener('keydown', onKeydown)
  }

  function reset() {
    stopListening()
    document.body.classList.remove('is-dragging-task')
    candidate = null
    draggingId.value = null
    dropColumn.value = null
    justDragged = false
  }

  function cancel() {
    reset()
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') cancel()
  }

  function activate(id: ID, point: GesturePoint) {
    draggingId.value = id
    dropColumn.value = columnAt(point)
    justDragged = true
    // Text selection would otherwise follow the pointer across the board.
    document.body.classList.add('is-dragging-task')
  }

  function moveTo(point: GesturePoint) {
    if (draggingId.value === null) return
    dropColumn.value = columnAt(point)
  }

  /** Applies the drop, whatever the outcome, and clears the gesture. */
  function finish() {
    const id = draggingId.value
    const column = dropColumn.value
    const wasDragged = justDragged
    reset()

    // The click that follows a drop must not open the card. It is cleared on
    // the next tick in case no click follows at all.
    justDragged = wasDragged
    if (wasDragged) window.setTimeout(() => (justDragged = false), 0)

    if (id === null || column === null) return
    onMove(id, column)
  }

  function onPointerMove(event: PointerEvent) {
    if (!candidate) return
    const point = { x: event.clientX, y: event.clientY }

    if (draggingId.value === null) {
      const dx = Math.abs(point.x - origin.x)
      const dy = Math.abs(point.y - origin.y)
      if (dx < DRAG_THRESHOLD_PX && dy < DRAG_THRESHOLD_PX) return
      activate(candidate, point)
      return
    }

    moveTo(point)
  }

  function onPointerUp() {
    finish()
  }

  function startWithMouse(event: PointerEvent, id: ID) {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    if ((event.target as HTMLElement).closest(CONTROL_SELECTOR)) return

    reset()
    candidate = id
    origin = { x: event.clientX, y: event.clientY }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('keydown', onKeydown)
  }

  function forCard(id: ID): BoardCardDrag {
    return {
      startWithMouse: (event) => startWithMouse(event, id),
      begin: (point) => {
        reset()
        candidate = id
        origin = point
        window.addEventListener('keydown', onKeydown)
        activate(id, point)
      },
      move: moveTo,
      drop: finish,
      cancel,
    }
  }

  /** True once, right after a drag: lets the card swallow its click. */
  function consumeDragClick(): boolean {
    if (!justDragged) return false
    justDragged = false
    return true
  }

  onUnmounted(reset)

  return {
    draggingId,
    dropColumn,
    forCard,
    consumeDragClick,
    cancel,
  }
}
