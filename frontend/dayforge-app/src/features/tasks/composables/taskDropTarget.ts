import { ref } from 'vue'
import type { ID } from '../../../entities/types'
import type { GesturePoint } from '../../../composables/usePressGesture'

/** Put on a sidebar project button that a dragged task can be dropped on. */
export const GOAL_DROP_ATTRIBUTE = 'data-drop-goal-id'

const FLASH_MS = 700

export type GoalDropState = {
  /** A task that may be moved to another project is being dragged. */
  active: boolean
  /** The project the dragged task already belongs to; it is not a target. */
  sourceGoalId: ID | undefined
  /** Project button under the pointer. */
  hoverGoalId: ID | null
  /** Project that has just received a drop, for the success pulse. */
  flashGoalId: ID | null
}

export const goalDropState = ref<GoalDropState>({
  active: false,
  sourceGoalId: undefined,
  hoverGoalId: null,
  flashGoalId: null,
})

type GoalDropHandler = (templateId: ID, goalId: ID) => void

const handlers = new Set<GoalDropHandler>()
let flashTimerId: number | undefined

/** The project button under a point, if it is a drop target. */
export function goalIdAt(point: GesturePoint): ID | null {
  const element = document.elementFromPoint(point.x, point.y)
  const button = element?.closest<HTMLElement>(`[${GOAL_DROP_ATTRIBUTE}]`)
  const goalId = button?.getAttribute(GOAL_DROP_ATTRIBUTE)
  return goalId ? (goalId as ID) : null
}

export function beginGoalDrop(sourceGoalId: ID | undefined) {
  goalDropState.value = {
    active: true,
    sourceGoalId,
    hoverGoalId: null,
    flashGoalId: goalDropState.value.flashGoalId,
  }
}

export function setHoverGoal(goalId: ID | null) {
  if (goalDropState.value.hoverGoalId !== goalId) {
    goalDropState.value.hoverGoalId = goalId
  }
}

export function endGoalDrop() {
  goalDropState.value = {
    ...goalDropState.value,
    active: false,
    sourceGoalId: undefined,
    hoverGoalId: null,
  }
}

/** Lets the sidebar (or anything else) react to a task dropped on a project. */
export function onTaskDroppedOnGoal(handler: GoalDropHandler): () => void {
  handlers.add(handler)
  return () => {
    handlers.delete(handler)
  }
}

export function emitTaskDroppedOnGoal(templateId: ID, goalId: ID) {
  flashGoal(goalId)
  handlers.forEach((handler) => handler(templateId, goalId))
}

function flashGoal(goalId: ID) {
  if (flashTimerId !== undefined) window.clearTimeout(flashTimerId)
  goalDropState.value.flashGoalId = goalId
  flashTimerId = window.setTimeout(() => {
    goalDropState.value.flashGoalId = null
    flashTimerId = undefined
  }, FLASH_MS)
}
