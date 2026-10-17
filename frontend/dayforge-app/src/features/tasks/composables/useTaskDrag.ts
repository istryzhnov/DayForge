import { onUnmounted, ref } from 'vue'
import type { ID } from '../../../entities/types'
import type { GesturePoint } from '../../../composables/usePressGesture'
import { useMediaQuery } from '../../../composables/useMediaQuery'
import { useMobileNav } from '../../sidebar/composables/useMobileNav'
import {
  beginGoalDrop,
  emitTaskDroppedOnGoal,
  endGoalDrop,
  goalIdAt,
  setHoverGoal,
} from './taskDropTarget'

/** Dropping here takes a task out of whatever project it sits in. */
export const DROP_ZONE_ROOT = 'root'

const DRAG_THRESHOLD_PX = 6
const INTERACTIVE_SELECTOR = 'button, input, select, textarea, a'
/** A finger held this close to the left edge opens the sidebar drawer. */
const EDGE_ZONE_PX = 24
const EDGE_HOLD_MS = 400
const NARROW_QUERY = '(max-width: 960px)'

export type DragTask = {
  templateId: ID
  title: string
  /** Project this task sits in today, so a drop that changes nothing is ignored. */
  parentZone: string
  /** Project (goal) the task belongs to today. */
  goalId?: ID
  /** Only top-level tasks can be moved to another project, as in "Move to…". */
  canMove: boolean
}

export type TaskDropPayload = {
  templateId: ID
  projectTemplateId: ID | null
  /** Row the task was dropped next to, when it landed on one. */
  targetTemplateId?: ID
  /** True when it should end up above that row. */
  placeAbove?: boolean
}

type DragActions = {
  onMove: (payload: TaskDropPayload) => void
}

/** What one row needs to take part in a drag. */
export type TaskRowDrag = {
  startWithMouse: (event: PointerEvent) => void
  begin: (point: GesturePoint) => void
  move: (point: GesturePoint) => void
  drop: () => void
  cancel: () => void
}

/**
 * Moving tasks between projects by dragging. A mouse drags straight away; a
 * finger has to hold first, which is what `usePressGesture` reports as a lift,
 * so the page can still be scrolled.
 */
export function useTaskDrag(actions: DragActions) {
  const draggingId = ref<ID | null>(null)
  const dragTitle = ref('')
  /** Where the dragged task came from, so "take it out" can be offered. */
  const dragParentZone = ref<string>(DROP_ZONE_ROOT)
  const dropZone = ref<string | null>(null)
  const dropRowId = ref<string | null>(null)
  const dropAbove = ref(false)
  const pointer = ref<GesturePoint>({ x: 0, y: 0 })
  /** Sidebar project under the pointer, when it would take the task. */
  const dropGoalId = ref<ID | null>(null)

  const isCoarse = useMediaQuery('(pointer: coarse)')
  const isNarrow = useMediaQuery(NARROW_QUERY)
  const { open: openMobileNav } = useMobileNav()

  let candidate: DragTask | null = null
  let origin: GesturePoint = { x: 0, y: 0 }
  let edgeTimerId: number | undefined

  /**
   * What sits under the pointer: the project it belongs to, and the row it is
   * closest to. The row decides both the order and, through the project that
   * holds it, where the task ends up.
   */
  function resolveTarget(point: GesturePoint) {
    const element = document.elementFromPoint(point.x, point.y)
    const zone =
      element?.closest<HTMLElement>('[data-drop-zone]')?.dataset.dropZone ??
      null
    const row = element?.closest<HTMLElement>('[data-drop-row]')
    const rowId = row?.dataset.dropRow

    const goalId = resolveGoalTarget(point)

    if (!row || !rowId || rowId === draggingId.value) {
      return { zone, rowId: null, above: false, goalId }
    }

    const box = row.getBoundingClientRect()
    return {
      zone,
      rowId,
      above: point.y < box.top + box.height / 2,
      goalId,
    }
  }

  /** A sidebar project only counts when the task is movable and it is not its own. */
  function resolveGoalTarget(point: GesturePoint): ID | null {
    if (!candidate?.canMove) return null
    const goalId = goalIdAt(point)
    if (!goalId || goalId === candidate.goalId) return null
    return goalId
  }

  function updateTarget(point: GesturePoint) {
    const target = resolveTarget(point)
    dropZone.value = target.zone
    dropRowId.value = target.rowId
    dropAbove.value = target.above
    dropGoalId.value = target.goalId
    setHoverGoal(target.goalId)
  }

  function clearEdgeTimer() {
    if (edgeTimerId !== undefined) {
      window.clearTimeout(edgeTimerId)
      edgeTimerId = undefined
    }
  }

  /** Touch only: a finger parked on the left edge opens the drawer for a drop. */
  function watchLeftEdge(point: GesturePoint) {
    const eligible =
      isCoarse.value && isNarrow.value && !!candidate?.canMove
    if (!eligible || point.x > EDGE_ZONE_PX) {
      clearEdgeTimer()
      return
    }
    if (edgeTimerId !== undefined) return
    edgeTimerId = window.setTimeout(() => {
      edgeTimerId = undefined
      openMobileNav()
    }, EDGE_HOLD_MS)
  }

  function stopListening() {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', cancel)
    window.removeEventListener('keydown', onKeydown)
  }

  function reset() {
    stopListening()
    clearEdgeTimer()
    endGoalDrop()
    document.body.classList.remove('is-dragging-task')
    candidate = null
    draggingId.value = null
    dropZone.value = null
    dropRowId.value = null
    dropAbove.value = false
    dropGoalId.value = null
  }

  function cancel() {
    reset()
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') cancel()
  }

  function activate(task: DragTask, point: GesturePoint) {
    draggingId.value = task.templateId
    dragTitle.value = task.title
    dragParentZone.value = task.parentZone
    pointer.value = point
    if (task.canMove) beginGoalDrop(task.goalId)
    updateTarget(point)
    // Text selection would otherwise follow the pointer across the list.
    document.body.classList.add('is-dragging-task')
  }

  function moveTo(point: GesturePoint) {
    if (draggingId.value === null) return
    pointer.value = point
    updateTarget(point)
    watchLeftEdge(point)
  }

  /** Applies the drop and clears the gesture, whatever the outcome. */
  function finish() {
    const dragged = candidate
    const zone = dropZone.value
    const targetRow = dropRowId.value
    const above = dropAbove.value
    const goalId = dropGoalId.value
    const wasDragging = draggingId.value !== null
    reset()

    if (!wasDragging || !dragged) return

    if (goalId) {
      emitTaskDroppedOnGoal(dragged.templateId, goalId)
      return
    }

    if (zone === null) return
    if (zone === dragged.templateId) return
    // Landing on open space inside the project it already lives in is a no-op.
    if (!targetRow && zone === dragged.parentZone) return

    actions.onMove({
      templateId: dragged.templateId,
      projectTemplateId: zone === DROP_ZONE_ROOT ? null : (zone as ID),
      targetTemplateId: (targetRow as ID | null) ?? undefined,
      placeAbove: above,
    })
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

  /** Mouse path: the button goes down and a few pixels of travel start it. */
  function startWithMouse(event: PointerEvent, task: DragTask) {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    if ((event.target as HTMLElement).closest(INTERACTIVE_SELECTOR)) return

    reset()
    candidate = task
    origin = { x: event.clientX, y: event.clientY }
    pointer.value = origin

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('keydown', onKeydown)
  }

  /** Touch path: the row has already been held long enough to be picked up. */
  function startWithTouch(task: DragTask, point: GesturePoint) {
    candidate = task
    origin = point
    activate(task, point)
  }

  /** Binds the shared gesture to one row. */
  function forRow(task: DragTask): TaskRowDrag {
    return {
      startWithMouse: (event) => startWithMouse(event, task),
      begin: (point) => startWithTouch(task, point),
      move: moveTo,
      drop: finish,
      cancel,
    }
  }

  onUnmounted(reset)

  return {
    draggingId,
    dragTitle,
    dragParentZone,
    dropZone,
    dropRowId,
    dropAbove,
    dropGoalId,
    pointer,
    forRow,
    cancel,
  }
}
