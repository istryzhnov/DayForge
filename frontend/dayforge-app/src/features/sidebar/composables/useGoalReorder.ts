import { onUnmounted, ref } from 'vue'
import type { ID } from '../../../entities/types'

const DRAG_THRESHOLD_PX = 6
const ROW_SELECTOR = '[data-reorder-goal-id]'

/** Where `movedId` lands when dropped above or below `targetId`. */
export function reorderedIds(
  ids: readonly ID[],
  movedId: ID,
  targetId: ID,
  placeAbove: boolean,
): ID[] {
  const rest = ids.filter((id) => id !== movedId)
  const index = rest.indexOf(targetId)
  if (index === -1) return [...ids]
  rest.splice(placeAbove ? index : index + 1, 0, movedId)
  return rest
}

/**
 * Dragging projects up and down the sidebar with a mouse. A finger long-press
 * already opens the project menu, so touch moves them from there instead.
 */
export function useGoalReorder(
  getIds: () => ID[],
  onReorder: (orderedIds: ID[]) => void,
) {
  const draggingId = ref<ID | null>(null)
  const dropTargetId = ref<ID | null>(null)
  const dropAbove = ref(false)

  let pendingId: ID | null = null
  let startX = 0
  let startY = 0

  function onPointerDown(event: PointerEvent, goalId: ID) {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    pendingId = goalId
    startX = event.clientX
    startY = event.clientY
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', reset)
  }

  function onPointerMove(event: PointerEvent) {
    if (draggingId.value === null) {
      const distance = Math.hypot(
        event.clientX - startX,
        event.clientY - startY,
      )
      if (distance < DRAG_THRESHOLD_PX) return
      draggingId.value = pendingId
      document.body.classList.add('is-reordering-goals')
    }

    const row = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>(ROW_SELECTOR)
    const targetId = row?.dataset.reorderGoalId ?? null

    if (!row || !targetId || targetId === draggingId.value) {
      dropTargetId.value = null
      return
    }

    const rect = row.getBoundingClientRect()
    dropTargetId.value = targetId
    dropAbove.value = event.clientY < rect.top + rect.height / 2
  }

  function onPointerUp() {
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

  /** The release that ends a drag must not also open the project. */
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
    pendingId = null
    draggingId.value = null
    dropTargetId.value = null
    document.body.classList.remove('is-reordering-goals')
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', reset)
  }

  onUnmounted(reset)

  return { draggingId, dropTargetId, dropAbove, onPointerDown }
}
