import type { ID } from '../../../entities/types'
import type { BoardStage } from '../../../entities/constants'
import {
  TOUR_STEP_BY_ID,
  pathSteps,
  type TourPath,
  type TourStepId,
} from './tourSteps'

/**
 * Pure rules of the getting-started tour, kept free of Vue and storage so the
 * sync harness can check them. Each step waits for the event that proves the
 * user did the thing; events that do not match the step are ignored.
 */

export type TourEvent =
  | 'project-created'
  | 'project-removed'
  | 'task-added'
  | 'task-removed'
  | 'subtask-added'
  | 'subtask-skipped'
  | 'board-shown'
  | 'board-declined'
  | 'list-shown'
  | 'card-moved'
  | 'task-done'
  | 'timer-started'
  | 'timer-stopped'
  | 'view-opened'

export interface TourEventPayload {
  goalId?: ID
  templateId?: ID
  /** The task a subtask was added under. */
  parentTemplateId?: ID
  taskId?: ID
  /** Undefined means the card went back to To do. */
  stage?: BoardStage
  /** The view that was opened, e.g. analytics. */
  view?: string
}

export interface TourState {
  /** The step on screen. */
  step: TourStepId
  /** Which list of steps the tour is following; "Not now" switches it. */
  path: TourPath
  /** The project the tour is working in, from the step that created or chose it. */
  projectId?: ID
  /** The task the tour is tracking through the board and the timer. */
  taskId?: ID
  done: boolean
  skipped: boolean
}

export function freshTourState(): TourState {
  return {
    step: 'create-project',
    path: 'board',
    done: false,
    skipped: false,
  }
}

/** A tour that has neither finished nor been skipped is running. */
export function isTourActive(state: TourState | null): state is TourState {
  return state !== null && !state.done && !state.skipped
}

/** Starting over is a no-op while a tour runs, so a second start cannot reset it. */
export function startTourState(state: TourState | null): TourState {
  return isTourActive(state) ? state : freshTourState()
}

export function finishTourState(state: TourState): TourState {
  return { ...state, done: true }
}

export function skipTourState(state: TourState): TourState {
  return { ...state, skipped: true }
}

/**
 * Reads what was saved. A value that does not describe a step of its path is
 * not a tour, so nothing starts from it.
 */
export function sanitizeTourState(raw: unknown): TourState | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Partial<Record<keyof TourState, unknown>>
  const path: TourPath = value.path === 'widget' ? 'widget' : 'board'
  const step = value.step
  if (
    typeof step !== 'string' ||
    !pathSteps(path).includes(step as TourStepId)
  ) {
    return null
  }
  return {
    step: step as TourStepId,
    path,
    projectId:
      typeof value.projectId === 'string' ? value.projectId : undefined,
    taskId: typeof value.taskId === 'string' ? value.taskId : undefined,
    done: value.done === true,
    skipped: value.skipped === true,
  }
}

/** "Step N of M" for the path the user is on, with N counted from 1. */
export function tourProgress(state: TourState): {
  number: number
  total: number
} {
  const steps = pathSteps(state.path)
  return { number: steps.indexOf(state.step) + 1, total: steps.length }
}

/** The step after this one along the path; the last one stays where it is. */
function nextStep(path: TourPath, step: TourStepId): TourStepId {
  const steps = pathSteps(path)
  const index = steps.indexOf(step)
  return steps[index + 1] ?? step
}

/** Deleting the project sends the tour back to creating one, from any step that needs it. */
function onProjectRemoved(
  state: TourState,
  payload: TourEventPayload,
): TourState {
  if (payload.goalId === undefined || payload.goalId !== state.projectId) {
    return state
  }
  const step = TOUR_STEP_BY_ID[state.step]
  if (!step.needsProject) {
    // The sidebar steps and the finish do not depend on it, so they stay put.
    return { ...state, projectId: undefined, taskId: undefined }
  }
  return {
    ...state,
    step: 'create-project',
    projectId: undefined,
    taskId: undefined,
  }
}

/** Deleting the tracked task sends the steps that need a card back to adding a task. */
function onTaskRemoved(state: TourState, payload: TourEventPayload): TourState {
  if (payload.templateId === undefined || payload.templateId !== state.taskId) {
    return state
  }
  const step = TOUR_STEP_BY_ID[state.step]
  return {
    ...state,
    taskId: undefined,
    step: step.needsTask ? 'add-task' : state.step,
  }
}

/**
 * Applies one app event. Anything that does not match the current step leaves
 * the state as it was, so a stray event never skips ahead.
 */
export function reduceTour(
  state: TourState | null,
  event: TourEvent,
  payload: TourEventPayload,
): TourState {
  if (!isTourActive(state)) return state ?? freshTourState()

  if (event === 'project-removed') return onProjectRemoved(state, payload)
  if (event === 'task-removed') return onTaskRemoved(state, payload)

  const step = TOUR_STEP_BY_ID[state.step]

  if (step.doneOn === event && (!step.check || step.check(payload, state))) {
    return {
      ...state,
      ...(step.record?.(payload) ?? {}),
      step: nextStep(state.path, step.id),
    }
  }

  if (step.branch?.on === event) {
    return { ...state, path: step.branch.path, step: step.branch.step }
  }

  if (step.skipOn === event) {
    return { ...state, step: nextStep(state.path, step.id) }
  }

  return state
}
