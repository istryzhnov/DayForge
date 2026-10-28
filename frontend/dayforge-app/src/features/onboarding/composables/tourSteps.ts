import { BOARD_STAGE } from '../../../entities/constants'
import type { TipPlacement } from './tips'
import type { TourEvent, TourEventPayload, TourState } from './tourMachine'

/** Where a "Show me" button takes the user when the control is off screen. */
export type TourOffscreen = 'project' | 'board' | 'drawer'

export type TourPath = 'board' | 'widget'

export type TourStepId =
  | 'create-project'
  | 'add-task'
  | 'add-subtask'
  | 'try-board'
  | 'move-to-doing'
  | 'start-timer'
  | 'stop-timer'
  | 'move-to-done'
  | 'back-to-list'
  | 'start-timer-widget'
  | 'stop-timer-widget'
  | 'analytics'
  | 'finish'

/**
 * One step of the tour. The bubble waits for `doneOn`, so the user has to do
 * the thing; pressing Next is not an option. The last step ends on a button.
 */
export interface TourStep {
  id: TourStepId
  placement?: TipPlacement
  /** Lives in the sidebar: a phone opens the drawer to show it. */
  sidebar?: boolean
  /** Five words or fewer. */
  title: string
  /** Eighteen words or fewer. */
  body: string
  /** Replaces body where the gesture differs, e.g. press and hold on a phone. */
  touchBody?: string
  /** CSS selector of the control to point at; null means no arrow. */
  anchor: ((state: TourState) => string) | null
  /** What "Show me" does when the control is off screen. */
  offscreen?: TourOffscreen
  doneOn: TourEvent | null
  /** Only this event counts, e.g. the right project or the tracked card. */
  check?: (payload: TourEventPayload, state: TourState) => boolean
  /** What the tour remembers once the step is done. */
  record?: (payload: TourEventPayload) => Partial<TourState>
  /** A "Skip" button: this event moves on along the same path. */
  skipOn?: TourEvent
  /** A "Show board" style offer: the button takes the user there. */
  offer?: { label: string; target: TourOffscreen }
  /** A "Not now" choice: its event moves the tour onto another path. */
  branch?: { on: TourEvent; path: TourPath; step: TourStepId }
  /** A deleted project or task sends the tour back to the step that makes it again. */
  needsProject?: boolean
  needsTask?: boolean
}

/** Quotes a value for an attribute selector, so odd characters in an id still match. */
function attribute(name: string, value: string): string {
  return `[${name}="${value.replace(/["\\]/g, '\\$&')}"]`
}

/** The board card or list row of the tracked task. */
function taskSelector(state: TourState): string {
  return attribute('data-tour-task', state.taskId ?? '')
}

/** The board card of the tracked task, for the card steps. */
function cardSelector(state: TourState): string {
  return taskSelector(state)
}

function sameProject(payload: TourEventPayload, state: TourState): boolean {
  return payload.goalId !== undefined && payload.goalId === state.projectId
}

function sameTask(payload: TourEventPayload, state: TourState): boolean {
  return payload.templateId !== undefined && payload.templateId === state.taskId
}

function sameParent(payload: TourEventPayload, state: TourState): boolean {
  return (
    payload.parentTemplateId !== undefined &&
    payload.parentTemplateId === state.taskId
  )
}

function sameTaskTimer(payload: TourEventPayload, state: TourState): boolean {
  return payload.taskId !== undefined && payload.taskId === state.taskId
}

/**
 * Every step, in no particular order; the paths below set the order. Anything
 * that depends on the view is looked up by its selector when the step is shown.
 */
export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: 'create-project',
    placement: 'right',
    sidebar: true,
    title: 'Create a project',
    body: 'Projects group your tasks.',
    anchor: () => attribute('data-tip-anchor', 'new-project'),
    doneOn: 'project-created',
    record: (payload) => ({ projectId: payload.goalId }),
  },
  {
    id: 'add-task',
    title: 'Add a task',
    body: 'A couple of words is enough.',
    anchor: () => attribute('data-tip-anchor', 'composer-input'),
    offscreen: 'project',
    doneOn: 'task-added',
    check: sameProject,
    record: (payload) => ({ taskId: payload.templateId }),
    needsProject: true,
  },
  {
    id: 'add-subtask',
    title: 'Break it into steps',
    body: 'Add a subtask under it.',
    anchor: (state) => `${taskSelector(state)} [aria-label="Add task to this"]`,
    offscreen: 'project',
    doneOn: 'subtask-added',
    check: sameParent,
    skipOn: 'subtask-skipped',
    needsProject: true,
    needsTask: true,
  },
  {
    id: 'try-board',
    title: 'Try the board?',
    body: 'The same tasks, shown as cards you can drag.',
    anchor: () => attribute('data-tip-anchor', 'board-tab'),
    offscreen: 'project',
    doneOn: 'board-shown',
    check: sameProject,
    offer: { label: 'Show board', target: 'board' },
    branch: {
      on: 'board-declined',
      path: 'widget',
      step: 'start-timer-widget',
    },
    needsProject: true,
  },
  {
    id: 'move-to-doing',
    title: 'Move it to In progress',
    body: 'Drag the card to the next column.',
    touchBody: 'Press and hold the card, then drag it to the next column.',
    anchor: cardSelector,
    offscreen: 'board',
    doneOn: 'card-moved',
    check: (payload, state) =>
      sameTask(payload, state) && payload.stage === BOARD_STAGE.DOING,
    needsProject: true,
    needsTask: true,
  },
  {
    id: 'start-timer',
    title: 'Start the timer',
    body: "Use the card's ⋯ menu: Start timer. Time goes to this task.",
    touchBody: "Tap the card's ⋯ button: Start timer. Time goes to this task.",
    // The card's timer button only appears once the task has time, so the menu is the way in.
    anchor: (state) => `${cardSelector(state)} .board-card__more`,
    offscreen: 'board',
    doneOn: 'timer-started',
    check: sameTaskTimer,
    needsProject: true,
    needsTask: true,
  },
  {
    id: 'stop-timer',
    title: "Stop it when you're done",
    body: 'Press the timer on the card to stop it.',
    touchBody: 'Tap the timer on the card to stop it.',
    anchor: (state) => `${cardSelector(state)} .task-timer-btn`,
    offscreen: 'board',
    doneOn: 'timer-stopped',
    check: sameTaskTimer,
    needsProject: true,
    needsTask: true,
  },
  {
    id: 'move-to-done',
    title: 'Finish it',
    body: 'Drag the card to Done.',
    touchBody: 'Press and hold the card, then drag it to Done.',
    anchor: cardSelector,
    offscreen: 'board',
    doneOn: 'task-done',
    check: sameTask,
    needsProject: true,
    needsTask: true,
  },
  {
    id: 'back-to-list',
    title: 'Back to the list',
    body: 'Board and list show the same tasks. Switch anytime.',
    anchor: () => attribute('data-tip-anchor', 'list-tab'),
    offscreen: 'project',
    doneOn: 'list-shown',
    check: sameProject,
    needsProject: true,
  },
  {
    id: 'start-timer-widget',
    sidebar: true,
    title: 'Start the timer',
    body: 'Pick your task and start.',
    anchor: () => attribute('data-tip-anchor', 'sidebar-timer'),
    offscreen: 'drawer',
    doneOn: 'timer-started',
  },
  {
    id: 'stop-timer-widget',
    sidebar: true,
    title: "Stop it when you're done",
    body: 'Press the running timer to stop it.',
    anchor: () => attribute('data-tip-anchor', 'sidebar-timer'),
    offscreen: 'drawer',
    doneOn: 'timer-stopped',
  },
  {
    id: 'analytics',
    sidebar: true,
    title: 'See your time',
    body: 'The minutes you just tracked are here.',
    anchor: () => attribute('data-tip-anchor', 'nav-analytics'),
    offscreen: 'drawer',
    doneOn: 'view-opened',
    check: (payload) => payload.view === 'analytics',
  },
  {
    id: 'finish',
    title: "You're set",
    body: 'Calendar plans your day. Tips live in ? → Help.',
    anchor: null,
    doneOn: null,
  },
]

/** The steps of the default path: the board is optional, so the widget path is the alternative. */
export const BOARD_PATH: readonly TourStepId[] = [
  'create-project',
  'add-task',
  'add-subtask',
  'try-board',
  'move-to-doing',
  'start-timer',
  'stop-timer',
  'move-to-done',
  'back-to-list',
  'analytics',
  'finish',
]

/** The path taken after "Not now": the timer is started from the sidebar instead. */
export const WIDGET_PATH: readonly TourStepId[] = [
  'create-project',
  'add-task',
  'add-subtask',
  'try-board',
  'start-timer-widget',
  'stop-timer-widget',
  'analytics',
  'finish',
]

export function pathSteps(path: TourPath): readonly TourStepId[] {
  return path === 'widget' ? WIDGET_PATH : BOARD_PATH
}

export const TOUR_STEP_BY_ID: Readonly<Record<TourStepId, TourStep>> =
  Object.fromEntries(TOUR_STEPS.map((step) => [step.id, step])) as Record<
    TourStepId,
    TourStep
  >
