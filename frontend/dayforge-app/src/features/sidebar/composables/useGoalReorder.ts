import { onUnmounted, ref } from 'vue'
import type { ID } from '../../../entities/types'

const DRAG_THRESHOLD_PX = 6
const ROW_SELECTOR = '[data-reorder-goal-id]'
/** A pointer this close to the top or bottom of the list scrolls it. */
const AUTO_SCROLL_EDGE_PX = 48
const AUTO_SCROLL_MAX_PX = 14

type Point = { x: number; y: number }

/** Where `movedId` lands when dropped above or below `targetId`. */
export function reorderedIds(
  ids: readonly ID[],
  movedId: ID,
  targetId: ID,
  placeAbove: boolean,
): ID[] {
  if (!ids.includes(movedId)) return [...ids]
  const rest = ids.filter((id) => id !== movedId)
  const index = rest.indexOf(targetId)
  if (index === -1) return [...ids]
  rest.splice(placeAbove ? index : index + 1, 0, movedId)
  return rest
}

/**
 * Dragging projects up and down the sidebar. A mouse drags after a few pixels
 * of travel; a touch drags once its long-press has lifted the row, so the
 * caller passes `lifted` and the hit-testing, drop line and commit are shared.
 */
export function useGoalReorder(
  getIds: () => ID[],
  onReorder: (orderedIds: ID[]) => void,
) {
  const draggingId = ref<ID | null>(null)
  const dropTargetId = ref<ID | null>(null)
  const dropAbove = ref(false)

  let pendingId: ID | null = null
  let startPoint: Point = { x: 0, y: 0 }
  let lastPoint: Point | null = null
  let scroller: HTMLElement | null = null
  let scrollFrame = 0

  /** Start tracking a press on `goalId`. A lifted press drags straight away. */
  function begin(goalId: ID, point: Point, lifted = false) {
    reset()
    pendingId = goalId
    startPoint = point
    lastPoint = point
    if (lifted) startDrag()
  }

  function move(point: Point) {
    if (pendingId === null) return
    lastPoint = point
    if (draggingId.value === null) {
      const distance = Math.hypot(
        point.x - startPoint.x,
        point.y - startPoint.y,
      )
      if (distance < DRAG_THRESHOLD_PX) return
      startDrag()
    }
    updateDropTarget(point)
  }

  /** Commit the move, if the project landed somewhere new. */
  function drop(point?: Point) {
    if (point) move(point)
    const movedId = draggingId.value
    const targetId = dropTargetId.value

    if (movedId !== null) {
      swallowNextClick()
      if (targetId !== null) {
        const ids = getIds()
        const next = reorderedIds(ids, movedId, targetId, dropAbove.value)
        if (next.some((id, index) => id !== ids[index])) onReorder(next)
      }
    }
    reset()
  }

  function cancel() {
    reset()
  }

  function onPointerDown(event: PointerEvent, goalId: ID) {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    begin(goalId, toPoint(event))
    window.addEventListener('pointermove', onMouseMove)
    window.addEventListener('pointerup', onMouseUp)
    window.addEventListener('pointercancel', cancel)
  }

  function onMouseMove(event: PointerEvent) {
    move(toPoint(event))
  }

  function onMouseUp(event: PointerEvent) {
    drop(toPoint(event))
  }

  function startDrag() {
    draggingId.value = pendingId
    document.body.classList.add('is-reordering-goals')
    scroller = findScrollParent(pendingId)
    if (scroller) scrollFrame = window.requestAnimationFrame(autoScrollTick)
    if (lastPoint) updateDropTarget(lastPoint)
  }

  function updateDropTarget(point: Point) {
    const row = document
      .elementFromPoint(point.x, point.y)
      ?.closest<HTMLElement>(ROW_SELECTOR)
    const targetId = row?.dataset.reorderGoalId ?? null

    if (!row || !targetId || targetId === draggingId.value) {
      dropTargetId.value = null
      return
    }

    const rect = row.getBoundingClientRect()
    dropTargetId.value = targetId
    dropAbove.value = point.y < rect.top + rect.height / 2
  }

  /** The list is the nearest scrollable box above the dragged row. */
  function findScrollParent(goalId: ID | null): HTMLElement | null {
    const row = Array.from(
      document.querySelectorAll<HTMLElement>(ROW_SELECTOR),
    ).find((element) => element.dataset.reorderGoalId === goalId)

    for (let element = row?.parentElement; element;) {
      const overflow = getComputedStyle(element).overflowY
      if (
        (overflow === 'auto' || overflow === 'scroll') &&
        element.scrollHeight > element.clientHeight
      ) {
        return element
      }
      element = element.parentElement
    }
    return null
  }

  /** Keeps scrolling while the pointer rests near the list's edge. */
  function autoScrollTick() {
    if (!scroller || !lastPoint) return
    scrollFrame = window.requestAnimationFrame(autoScrollTick)

    const rect = scroller.getBoundingClientRect()
    const fromTop = lastPoint.y - rect.top
    const fromBottom = rect.bottom - lastPoint.y
    let step = 0
    if (fromTop < AUTO_SCROLL_EDGE_PX) step = -edgeStep(fromTop)
    else if (fromBottom < AUTO_SCROLL_EDGE_PX) step = edgeStep(fromBottom)
    if (step === 0) return

    scroller.scrollTop += step
    updateDropTarget(lastPoint)
  }

  /** Closer to the edge scrolls faster, up to AUTO_SCROLL_MAX_PX a frame. */
  function edgeStep(distance: number): number {
    const depth = Math.min(
      1,
      Math.max(0, (AUTO_SCROLL_EDGE_PX - distance) / AUTO_SCROLL_EDGE_PX),
    )
    return Math.ceil(depth * AUTO_SCROLL_MAX_PX)
  }

  /** The release that ends a mouse drag must not also open the project. */
  function swallowNextClick() {
    function handler(event: Event) {
      event.stopPropagation()
      event.preventDefault()
    }
    window.addEventListener('click', handler, { capture: true, once: true })
    window.setTimeout(
      () => window.removeEventListener('click', handler, true),
      0,
    )
  }

  function reset() {
    window.cancelAnimationFrame(scrollFrame)
    scrollFrame = 0
    scroller = null
    pendingId = null
    lastPoint = null
    draggingId.value = null
    dropTargetId.value = null
    document.body.classList.remove('is-reordering-goals')
    window.removeEventListener('pointermove', onMouseMove)
    window.removeEventListener('pointerup', onMouseUp)
    window.removeEventListener('pointercancel', cancel)
  }

  onUnmounted(reset)

  return {
    draggingId,
    dropTargetId,
    dropAbove,
    onPointerDown,
    begin,
    move,
    drop,
    cancel,
  }
}

function toPoint(event: PointerEvent): Point {
  return { x: event.clientX, y: event.clientY }
}
