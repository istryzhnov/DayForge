import type { ID } from '../../../entities/types'
import type { BoardStage } from '../../../entities/constants'
import {
  CHAPTER_IDS,
  TOUR_CHAPTER_BY_ID,
  TOUR_STEP_BY_ID,
  type ChapterId,
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
  // Chapters after Basics
  | 'next'
  | 'step-skipped'
  | 'schedule-opened'
  | 'schedule-edited'
  | 'task-repeats'
  | 'task-timed'
  | 'block-created'
  | 'calendar-view-changed'
  | 'timer-mode-changed'
  | 'analytics-tab'
  | 'quick-add-opened'
  | 'quick-add-used'
  | 'search-opened'
  | 'help-opened'

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
  /** A task was added with a date and time. */
  scheduled?: boolean
  /** A task was given a time by dragging it from Unscheduled, not by moving a block. */
  fromList?: boolean
  /** Quick add read a date word such as "tomorrow". */
  dated?: boolean
  /** The analytics tab that was opened. */
  tab?: string
  /** The timer mode or calendar view that was picked. */
  mode?: string
}

export interface TourState {
  /** The chapter this run follows. Absent in data saved before chapters: Basics. */
  chapter: ChapterId
  /** The step on screen. */
  step: TourStepId
  /** Which list of steps the chapter is following; "Not now" switches it. */
  path: TourPath
  /** The project the tour is working in, from the step that created or chose it. */
  projectId?: ID
  /** The task the tour is tracking through the board and the timer. */
  taskId?: ID
  /** Taken at start: on a touch device the keyboard-only steps are left out. */
  touch: boolean
  done: boolean
  skipped: boolean
}

/** What is stored: the run on screen, and the chapters finished so far. */
export interface TourStore {
  run: TourState | null
  completed: ChapterId[]
}

/** The steps of a chapter on a path, without the ones this device does not show. */
export function pathSteps(
  chapter: ChapterId,
  path: TourPath,
  touch: boolean,
): readonly TourStepId[] {
  const steps = TOUR_CHAPTER_BY_ID[chapter].paths[path] ?? []
  return steps.filter((id) =>
    touch ? !TOUR_STEP_BY_ID[id].keyboardOnly : !TOUR_STEP_BY_ID[id].touchOnly,
  )
}

/** A fresh run of a chapter, at its first step. */
export function freshTourState(
  chapter: ChapterId = 'basics',
  touch = false,
): TourState {
  const path = TOUR_CHAPTER_BY_ID[chapter].defaultPath
  return {
    chapter,
    step: pathSteps(chapter, path, touch)[0],
    path,
    touch,
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
 * Reads one run. A value that does not describe a step of its chapter's path
 * is not a tour, so nothing starts from it. Data saved before chapters has no
 * `chapter`, which means Basics.
 */
export function sanitizeTourState(raw: unknown): TourState | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Partial<Record<keyof TourState, unknown>>
  const chapter = value.chapter === undefined ? 'basics' : value.chapter
  if (
    typeof chapter !== 'string' ||
    !CHAPTER_IDS.includes(chapter as ChapterId)
  ) {
    return null
  }
  const definition = TOUR_CHAPTER_BY_ID[chapter as ChapterId]
  const path: TourPath =
    typeof value.path === 'string' &&
    definition.paths[value.path as TourPath] !== undefined
      ? (value.path as TourPath)
      : definition.defaultPath
  const step = value.step
  if (
    typeof step !== 'string' ||
    !(definition.paths[path] ?? []).includes(step as TourStepId)
  ) {
    return null
  }
  const touch = value.touch === true
  const onPath = pathSteps(definition.id, path, touch)
  return {
    chapter: definition.id,
    step: onPath.includes(step as TourStepId)
      ? (step as TourStepId)
      : onPath[0],
    path,
    projectId:
      typeof value.projectId === 'string' ? value.projectId : undefined,
    taskId: typeof value.taskId === 'string' ? value.taskId : undefined,
    touch,
    done: value.done === true,
    skipped: value.skipped === true,
  }
}

/** Chapters finished so far: known ids only, each once. */
function sanitizeCompleted(raw: unknown): ChapterId[] {
  if (!Array.isArray(raw)) return []
  const known = raw.filter(
    (id): id is ChapterId =>
      typeof id === 'string' && CHAPTER_IDS.includes(id as ChapterId),
  )
  return [...new Set(known)]
}

/**
 * Reads what was saved. The current shape is `{ run, completed }`. The shape
 * from before chapters was the bare Basics run; it reads as that run, and a
 * finished one counts as Basics completed. Anything else starts nothing.
 */
export function sanitizeTourStore(raw: unknown): TourStore {
  if (!raw || typeof raw !== 'object') return { run: null, completed: [] }
  const value = raw as Record<string, unknown>
  if ('run' in value || 'completed' in value) {
    return {
      run: sanitizeTourState(value.run),
      completed: sanitizeCompleted(value.completed),
    }
  }
  const run = sanitizeTourState(raw)
  return { run, completed: run?.done ? ['basics'] : [] }
}

/** "Step N of M" for the chapter path the user is on, with N counted from 1. */
export function tourProgress(state: TourState): {
  number: number
  total: number
} {
  const steps = pathSteps(state.chapter, state.path, state.touch)
  return { number: steps.indexOf(state.step) + 1, total: steps.length }
}

/** The step after this one along the path; the last one stays where it is. */
function nextStep(state: TourState, step: TourStepId): TourStepId {
  const steps = pathSteps(state.chapter, state.path, state.touch)
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
      step: nextStep(state, step.id),
    }
  }

  if (step.branch?.on === event) {
    return { ...state, path: step.branch.path, step: step.branch.step }
  }

  if (step.skipOn === event) {
    return { ...state, step: nextStep(state, step.id) }
  }

  return state
}
