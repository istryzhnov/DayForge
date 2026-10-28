/** Compat checks: the getting-started tour advances only on the matching action, on either path. */

import {
  finishTourState,
  freshTourState,
  isTourActive,
  reduceTour,
  sanitizeTourState,
  skipTourState,
  startTourState,
  tourProgress,
  type TourEvent,
  type TourEventPayload,
  type TourState,
} from '../../../src/features/onboarding/composables/tourMachine'
import {
  BOARD_PATH,
  TOUR_STEPS,
  WIDGET_PATH,
} from '../../../src/features/onboarding/composables/tourSteps'
import { check, section } from './harness'

/** Feeds events in order, so a check reads as the user's session. */
function play(
  start: TourState | null,
  events: Array<[TourEvent, TourEventPayload]>,
): TourState {
  return events.reduce<TourState>(
    (state, [event, payload]) => reduceTour(state, event, payload),
    start ?? freshTourState(),
  )
}

/** Creates the project, adds the tracked task and gives it a subtask: shared by both paths. */
const SETUP: Array<[TourEvent, TourEventPayload]> = [
  ['project-created', { goalId: 'p1' }],
  ['task-added', { goalId: 'p1', templateId: 't1' }],
  ['subtask-added', { parentTemplateId: 't1', templateId: 's1' }],
]

/** The board path, every step done in order. */
const BOARD_RUN: Array<[TourEvent, TourEventPayload]> = [
  ...SETUP,
  ['board-shown', { goalId: 'p1' }],
  ['card-moved', { templateId: 't1', stage: 'doing' }],
  ['timer-started', { taskId: 't1' }],
  ['timer-stopped', { taskId: 't1' }],
  ['task-done', { templateId: 't1' }],
  ['list-shown', { goalId: 'p1' }],
  ['view-opened', { view: 'analytics' }],
]

/** The "Not now" path: the sidebar timer is used instead of the board. */
const WIDGET_RUN: Array<[TourEvent, TourEventPayload]> = [
  ...SETUP,
  ['board-declined', {}],
  ['timer-started', {}],
  ['timer-stopped', {}],
  ['view-opened', { view: 'analytics' }],
]

function progressOf(state: TourState): string {
  const progress = tourProgress(state)
  return `${progress.number}/${progress.total}`
}

export function verifyTourSteps() {
  section('Getting-started tour: copy and paths')

  check(
    'the board path has eleven steps and the widget path eight',
    BOARD_PATH.length === 11 && WIDGET_PATH.length === 8,
  )
  check(
    'every step title is five words or fewer',
    TOUR_STEPS.every((step) => step.title.split(/\s+/).length <= 5),
    TOUR_STEPS.map((step) => step.title),
  )
  check(
    'every step body, and every touch body, is eighteen words or fewer',
    TOUR_STEPS.every(
      (step) =>
        step.body.split(/\s+/).length <= 18 &&
        (step.touchBody ?? '').split(/\s+/).length <= 18,
    ),
  )
  check(
    'each path only names steps that exist',
    [...BOARD_PATH, ...WIDGET_PATH].every((id) =>
      TOUR_STEPS.some((step) => step.id === id),
    ),
  )
}

export function verifyTourPaths() {
  section('Getting-started tour: paths and counts')

  const fresh = startTourState(null)
  check(
    'starting from nothing begins at the first step',
    fresh.step === 'create-project' && isTourActive(fresh),
  )
  check(
    'starting while running keeps the running tour',
    startTourState(play(null, SETUP)).step === 'try-board',
  )
  check('the first step reads 1/11', progressOf(fresh) === '1/11')

  const board = play(fresh, BOARD_RUN)
  check('a full board run reaches the finish', board.step === 'finish', board)
  check(
    'a full board run keeps the project and the tracked task',
    board.projectId === 'p1' && board.taskId === 't1' && board.path === 'board',
    board,
  )
  check(
    'the finish of the board path reads 11/11',
    progressOf(board) === '11/11',
  )

  const widget = play(fresh, WIDGET_RUN)
  check('a "Not now" run reaches the finish', widget.step === 'finish', widget)
  check('a "Not now" run switches to the widget path', widget.path === 'widget')
  check('the finish of the widget path reads 8/8', progressOf(widget) === '8/8')

  const declined = play(fresh, [...SETUP, ['board-declined', {}]])
  check(
    '"Not now" lands on the sidebar timer and counts 5/8',
    declined.step === 'start-timer-widget' &&
      declined.path === 'widget' &&
      progressOf(declined) === '5/8',
    declined,
  )

  const widgetStop = play(declined, [['timer-started', {}]])
  check(
    'a sidebar start moves to the sidebar stop',
    widgetStop.step === 'stop-timer-widget',
  )

  const skipped = play(play(null, SETUP.slice(0, 2)), [['subtask-skipped', {}]])
  check(
    'skipping the subtask step moves on to the board offer',
    skipped.step === 'try-board',
    skipped,
  )

  const boardShownAfterSkip = play(skipped, [['board-shown', { goalId: 'p1' }]])
  check(
    'the board offer moves to moving the card',
    boardShownAfterSkip.step === 'move-to-doing',
  )
}

export function verifyTourGuards() {
  section('Getting-started tour: events that do not match')

  const atOffer = play(null, SETUP)

  check(
    'a task in another project does not advance',
    play(play(null, SETUP.slice(0, 1)), [
      ['task-added', { goalId: 'p2', templateId: 'x' }],
    ]).step === 'add-task',
  )
  check(
    'a subtask under another task does not advance',
    play(atOffer, [['subtask-added', { parentTemplateId: 'other' }]]) ===
      atOffer,
  )
  check(
    'a board opened for another project does not advance',
    play(atOffer, [['board-shown', { goalId: 'p9' }]]) === atOffer,
  )
  check(
    'a list view for another project does not advance',
    play(play(null, [...SETUP, ['board-shown', { goalId: 'p1' }]]), [
      ['list-shown', { goalId: 'p9' }],
    ]).step === 'move-to-doing',
  )

  const atMove = play(null, [...SETUP, ['board-shown', { goalId: 'p1' }]])
  check(
    'moving another card does not advance',
    play(atMove, [['card-moved', { templateId: 'other', stage: 'doing' }]]) ===
      atMove,
  )
  check(
    'moving the tracked card to To do does not satisfy In progress',
    play(atMove, [['card-moved', { templateId: 't1', stage: undefined }]]) ===
      atMove,
  )

  const atStart = play(atMove, [
    ['card-moved', { templateId: 't1', stage: 'doing' }],
  ])
  check(
    'a timer on another task does not advance',
    play(atStart, [['timer-started', { taskId: 'other' }]]) === atStart,
  )

  const atDone = play(atStart, [
    ['timer-started', { taskId: 't1' }],
    ['timer-stopped', { taskId: 't1' }],
  ])
  check(
    'finishing another task does not advance',
    play(atDone, [['task-done', { templateId: 'other' }]]) === atDone,
  )

  const atAnalytics = play(null, BOARD_RUN.slice(0, 9))
  check(
    'opening another view does not satisfy Analytics',
    play(atAnalytics, [['view-opened', { view: 'timer' }]]) === atAnalytics,
  )

  const atFinish = play(null, BOARD_RUN)
  check(
    'the finish step waits for its button',
    play(atFinish, [['project-created', { goalId: 'zz' }]]) === atFinish,
  )
}

export function verifyTourLifecycle() {
  section('Getting-started tour: finishing, skipping, restarting')

  const done = finishTourState(play(null, BOARD_RUN))
  check('finishing ends the tour', done.done && !isTourActive(done))
  check(
    'events after the finish do not change a finished tour',
    play(done, [['task-added', { goalId: 'p1', templateId: 'n' }]]) === done,
  )
  check(
    'starting again after a finish begins a fresh tour',
    startTourState(done).step === 'create-project' &&
      isTourActive(startTourState(done)),
  )

  const skipped = skipTourState(play(null, SETUP))
  check('skipping ends the tour', skipped.skipped && !isTourActive(skipped))
  check(
    'events after a skip do not change the tour',
    play(skipped, [['board-shown', { goalId: 'p1' }]]) === skipped,
  )
}

export function verifyTourDeletions() {
  section('Getting-started tour: deleted project or task')

  const atMove = play(null, [...SETUP, ['board-shown', { goalId: 'p1' }]])
  const projectGone = play(atMove, [['project-removed', { goalId: 'p1' }]])
  check(
    'deleting the project during the board steps starts again at creating one',
    projectGone.step === 'create-project' &&
      projectGone.projectId === undefined &&
      projectGone.taskId === undefined,
    projectGone,
  )

  const atAnalytics = play(null, BOARD_RUN.slice(0, 9))
  const afterAnalytics = play(atAnalytics, [
    ['project-removed', { goalId: 'p1' }],
  ])
  check(
    'deleting the project after the list step keeps the Analytics step',
    afterAnalytics.step === 'analytics' &&
      afterAnalytics.projectId === undefined,
    afterAnalytics,
  )

  const otherGone = play(atMove, [['project-removed', { goalId: 'p9' }]])
  check('deleting another project changes nothing', otherGone === atMove)

  const atStart = play(atMove, [
    ['card-moved', { templateId: 't1', stage: 'doing' }],
  ])
  const taskGone = play(atStart, [['task-removed', { templateId: 't1' }]])
  check(
    'deleting the tracked task at the timer step goes back to adding a task',
    taskGone.step === 'add-task' && taskGone.taskId === undefined,
    taskGone,
  )

  const recovered = play(taskGone, [
    ['task-added', { goalId: 'p1', templateId: 't2' }],
    ['subtask-added', { parentTemplateId: 't2' }],
    ['board-shown', { goalId: 'p1' }],
  ])
  check(
    'a new task carries the board steps on after a deleted one',
    recovered.step === 'move-to-doing' && recovered.taskId === 't2',
    recovered,
  )

  const atOffer = play(null, SETUP)
  const offerTaskGone = play(atOffer, [['task-removed', { templateId: 't1' }]])
  check(
    'deleting the task at the board offer keeps the offer',
    offerTaskGone.step === 'try-board',
  )

  const atWidget = play(null, [...SETUP, ['board-declined', {}]])
  const widgetTaskGone = play(atWidget, [
    ['task-removed', { templateId: 't1' }],
  ])
  check(
    'deleting the task on the sidebar path changes no step',
    widgetTaskGone.step === 'start-timer-widget',
  )
}

export function verifyTourStorage() {
  section('Getting-started tour: storage')

  check('a missing value starts no tour', sanitizeTourState(null) === null)
  check(
    'a damaged value starts no tour',
    sanitizeTourState('nonsense') === null,
  )
  check(
    'a step that is not on its path starts no tour',
    sanitizeTourState({
      step: 'move-to-doing',
      path: 'widget',
      done: false,
    }) === null,
  )
  check(
    'an unknown step starts no tour',
    sanitizeTourState({ step: 'nope', path: 'board', done: false }) === null,
  )
  check(
    'a saved widget-path step reads back on its path',
    (() => {
      const read = sanitizeTourState({
        step: 'stop-timer-widget',
        path: 'widget',
        projectId: 'p1',
        taskId: 't1',
        done: false,
        skipped: true,
      })
      return (
        read?.step === 'stop-timer-widget' &&
        read.path === 'widget' &&
        read.projectId === 'p1' &&
        read.taskId === 't1' &&
        read.skipped === true
      )
    })(),
  )
}
