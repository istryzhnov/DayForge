import { BOARD_STAGE } from '../../../entities/constants'
import type { TipPlacement } from './tips'
import type { TourEvent, TourEventPayload, TourState } from './tourMachine'

/**
 * Where a "Show me" button takes the user when the control is off screen.
 * `view:`, `settings:` and `analytics:` names are looked up by the owner, so
 * the tour never imports the screens it opens.
 */
export type TourOffscreen =
  | 'project'
  | 'board'
  | 'drawer'
  | 'profile'
  | `view:${string}`
  | `settings:${string}`
  | `analytics:${string}`

/** Which list of steps a chapter follows. Basics has two; the rest have one. */
export type TourPath = 'board' | 'widget' | 'main'

export const CHAPTER_IDS = [
  'basics',
  'scheduling',
  'calendar',
  'timer',
  'habits',
  'money',
  'shortcuts',
  'settings',
] as const

export type ChapterId = (typeof CHAPTER_IDS)[number]

export type TourStepId =
  // Basics
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
  // Scheduling
  | 'sched-open'
  | 'sched-when'
  | 'sched-repeat'
  | 'sched-add'
  | 'sched-end'
  | 'sched-planned'
  | 'scheduling-finish'
  // Calendar
  | 'cal-open'
  | 'cal-views'
  | 'cal-drag'
  | 'cal-block'
  | 'cal-filter'
  | 'calendar-finish'
  // Timer
  | 'timer-open'
  | 'timer-mode'
  | 'timer-start'
  | 'timer-stop'
  | 'timer-history'
  | 'timer-away'
  | 'timer-finish'
  // Habits
  | 'habit-schedule'
  | 'habit-repeat'
  | 'habit-card'
  | 'habit-tab'
  | 'habits-finish'
  // Money
  | 'money-rate'
  | 'money-clients'
  | 'money-budget'
  | 'money-tab'
  | 'money-export'
  | 'money-finish'
  // Shortcuts
  | 'short-quick-key'
  | 'short-quick-touch'
  | 'short-dates'
  | 'short-search-key'
  | 'short-search-touch'
  | 'short-reorder'
  | 'short-menu'
  | 'short-help'
  | 'shortcuts-finish'
  // Settings
  | 'set-language'
  | 'set-theme'
  | 'set-start'
  | 'set-account'
  | 'settings-finish'

/**
 * One step of the tour. The bubble waits for `doneOn`, so the user has to do
 * the thing. `doneOn: 'next'` is an informational step with a Next button; a
 * null `doneOn` is the chapter's last step, which ends on buttons.
 */
export interface TourStep {
  id: TourStepId
  placement?: TipPlacement
  /** Lives in the sidebar: a phone opens the drawer to show it. */
  sidebar?: boolean
  /** Message keys: rendered with t() at display time, so a language switch updates them. */
  titleKey: string
  bodyKey: string
  /** Replaces body where the gesture differs, e.g. press and hold on a phone. */
  touchBodyKey?: string
  /** CSS selector of the control to point at; null means no arrow. */
  anchor: ((state: TourState) => string) | string | null
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
  offer?: { labelKey: string; target: TourOffscreen }
  /** A "Not now" choice: its event moves the tour onto another path. */
  branch?: { on: TourEvent; path: TourPath; step: TourStepId }
  /** A deleted project or task sends the tour back to the step that makes it again. */
  needsProject?: boolean
  needsTask?: boolean
  /** Only on a keyboard: skipped on touch devices. */
  keyboardOnly?: boolean
  /** Only on a touch device: the touch equivalent of a keyboard step. */
  touchOnly?: boolean
}

export interface TourChapter {
  id: ChapterId
  /** Message key for the chapter's name, shown in the pill and the list. */
  titleKey: string
  defaultPath: TourPath
  paths: Partial<Record<TourPath, readonly TourStepId[]>>
}

/** Quotes a value for an attribute selector, so odd characters in an id still match. */
function attribute(name: string, value: string): string {
  return `[${name}="${value.replace(/["\\]/g, '\\$&')}"]`
}

/** A control that carries a `data-tip-anchor` value. */
function anchorTo(name: string): string {
  return attribute('data-tip-anchor', name)
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

/** An informational step: the Next button moves on. */
function info(
  id: TourStepId,
  copy: { titleKey: string; bodyKey: string; touchBodyKey?: string },
  anchor: string | null,
  offscreen?: TourOffscreen,
): TourStep {
  return { id, ...copy, anchor, offscreen, doneOn: 'next' }
}

/** A chapter's last step: its buttons end the chapter or move to the next one. */
function chapterFinish(id: TourStepId): TourStep {
  return {
    id,
    titleKey: 'onboarding.tourChapterDoneTitle',
    bodyKey: 'onboarding.tourChapterDoneBody',
    anchor: null,
    doneOn: null,
  }
}

/** Basics: the original tour, unchanged in ids and behaviour. */
const BASICS_STEPS: readonly TourStep[] = [
  {
    id: 'create-project',
    placement: 'right',
    sidebar: true,
    titleKey: 'onboarding.tourCreateProjectTitle',
    bodyKey: 'onboarding.tourCreateProjectBody',
    anchor: anchorTo('new-project'),
    doneOn: 'project-created',
    record: (payload) => ({ projectId: payload.goalId }),
  },
  {
    id: 'add-task',
    titleKey: 'onboarding.tourAddTaskTitle',
    bodyKey: 'onboarding.tourAddTaskBody',
    anchor: anchorTo('composer-input'),
    offscreen: 'project',
    doneOn: 'task-added',
    check: sameProject,
    record: (payload) => ({ taskId: payload.templateId }),
    needsProject: true,
  },
  {
    id: 'add-subtask',
    titleKey: 'onboarding.tourAddSubtaskTitle',
    bodyKey: 'onboarding.tourAddSubtaskBody',
    anchor: (state) =>
      `${taskSelector(state)} [data-tour-action="add-subtask"]`,
    offscreen: 'project',
    doneOn: 'subtask-added',
    check: sameParent,
    skipOn: 'subtask-skipped',
    needsProject: true,
    needsTask: true,
  },
  {
    id: 'try-board',
    titleKey: 'onboarding.tourTryBoardTitle',
    bodyKey: 'onboarding.tourTryBoardBody',
    anchor: anchorTo('board-tab'),
    offscreen: 'project',
    doneOn: 'board-shown',
    check: sameProject,
    offer: { labelKey: 'onboarding.tourShowBoard', target: 'board' },
    branch: {
      on: 'board-declined',
      path: 'widget',
      step: 'start-timer-widget',
    },
    needsProject: true,
  },
  {
    id: 'move-to-doing',
    titleKey: 'onboarding.tourMoveToDoingTitle',
    bodyKey: 'onboarding.tourMoveToDoingBody',
    touchBodyKey: 'onboarding.tourMoveToDoingTouchBody',
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
    titleKey: 'onboarding.tourStartTimerTitle',
    bodyKey: 'onboarding.tourStartTimerBody',
    touchBodyKey: 'onboarding.tourStartTimerTouchBody',
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
    titleKey: 'onboarding.tourStopTimerTitle',
    bodyKey: 'onboarding.tourStopTimerBody',
    touchBodyKey: 'onboarding.tourStopTimerTouchBody',
    anchor: (state) => `${cardSelector(state)} .task-timer-btn`,
    offscreen: 'board',
    doneOn: 'timer-stopped',
    check: sameTaskTimer,
    needsProject: true,
    needsTask: true,
  },
  {
    id: 'move-to-done',
    titleKey: 'onboarding.tourMoveToDoneTitle',
    bodyKey: 'onboarding.tourMoveToDoneBody',
    touchBodyKey: 'onboarding.tourMoveToDoneTouchBody',
    anchor: cardSelector,
    offscreen: 'board',
    doneOn: 'task-done',
    check: sameTask,
    needsProject: true,
    needsTask: true,
  },
  {
    id: 'back-to-list',
    titleKey: 'onboarding.tourBackToListTitle',
    bodyKey: 'onboarding.tourBackToListBody',
    anchor: anchorTo('list-tab'),
    offscreen: 'project',
    doneOn: 'list-shown',
    check: sameProject,
    needsProject: true,
  },
  {
    id: 'start-timer-widget',
    sidebar: true,
    titleKey: 'onboarding.tourStartTimerTitle',
    bodyKey: 'onboarding.tourStartTimerWidgetBody',
    anchor: anchorTo('sidebar-timer'),
    offscreen: 'drawer',
    doneOn: 'timer-started',
  },
  {
    id: 'stop-timer-widget',
    sidebar: true,
    titleKey: 'onboarding.tourStopTimerTitle',
    bodyKey: 'onboarding.tourStopTimerWidgetBody',
    anchor: anchorTo('sidebar-timer'),
    offscreen: 'drawer',
    doneOn: 'timer-stopped',
  },
  {
    id: 'analytics',
    sidebar: true,
    titleKey: 'onboarding.tourAnalyticsTitle',
    bodyKey: 'onboarding.tourAnalyticsBody',
    anchor: anchorTo('nav-analytics'),
    offscreen: 'drawer',
    doneOn: 'view-opened',
    check: (payload) => payload.view === 'analytics',
  },
  {
    id: 'finish',
    titleKey: 'onboarding.tourFinishTitle',
    bodyKey: 'onboarding.tourFinishBody',
    anchor: null,
    doneOn: null,
  },
]

/** Scheduling: the composer's calendar button, the fields, and the Planned list. */
const SCHEDULING_STEPS: readonly TourStep[] = [
  {
    id: 'sched-open',
    titleKey: 'onboarding.tourSchedOpenTitle',
    bodyKey: 'onboarding.tourSchedOpenBody',
    anchor: anchorTo('composer-calendar'),
    offscreen: 'view:goals',
    doneOn: 'schedule-opened',
  },
  {
    id: 'sched-when',
    titleKey: 'onboarding.tourSchedWhenTitle',
    bodyKey: 'onboarding.tourSchedWhenBody',
    anchor: anchorTo('composer-times'),
    offscreen: 'view:goals',
    doneOn: 'schedule-edited',
  },
  info(
    'sched-repeat',
    {
      titleKey: 'onboarding.tourSchedRepeatTitle',
      bodyKey: 'onboarding.tourSchedRepeatBody',
    },
    anchorTo('composer-repeat'),
    'view:goals',
  ),
  {
    id: 'sched-add',
    titleKey: 'onboarding.tourSchedAddTitle',
    bodyKey: 'onboarding.tourSchedAddBody',
    anchor: anchorTo('composer-input'),
    offscreen: 'view:goals',
    doneOn: 'task-added',
    check: (payload) => payload.scheduled === true,
  },
  info(
    'sched-end',
    {
      titleKey: 'onboarding.tourSchedEndTitle',
      bodyKey: 'onboarding.tourSchedEndBody',
    },
    anchorTo('composer-times'),
    'view:goals',
  ),
  {
    id: 'sched-planned',
    sidebar: true,
    titleKey: 'onboarding.tourSchedPlannedTitle',
    bodyKey: 'onboarding.tourSchedPlannedBody',
    anchor: anchorTo('nav-planned'),
    offscreen: 'drawer',
    doneOn: 'view-opened',
    check: (payload) => payload.view === 'planned',
  },
  chapterFinish('scheduling-finish'),
]

/** Calendar: the day grid, drag from Unscheduled, drawing a block, filtering. */
const CALENDAR_STEPS: readonly TourStep[] = [
  {
    id: 'cal-open',
    sidebar: true,
    titleKey: 'onboarding.tourCalOpenTitle',
    bodyKey: 'onboarding.tourCalOpenBody',
    anchor: anchorTo('nav-calendar'),
    offscreen: 'drawer',
    doneOn: 'view-opened',
    check: (payload) => payload.view === 'calendar',
  },
  {
    id: 'cal-views',
    titleKey: 'onboarding.tourCalViewsTitle',
    bodyKey: 'onboarding.tourCalViewsBody',
    anchor: anchorTo('calendar-views'),
    offscreen: 'view:calendar',
    doneOn: 'calendar-view-changed',
  },
  {
    id: 'cal-drag',
    titleKey: 'onboarding.tourCalDragTitle',
    bodyKey: 'onboarding.tourCalDragBody',
    touchBodyKey: 'onboarding.tourCalDragTouchBody',
    anchor: anchorTo('calendar-unscheduled'),
    offscreen: 'view:calendar',
    doneOn: 'task-timed',
    // Only a task taken from Unscheduled counts, not a block being moved.
    check: (payload) => payload.fromList === true,
    // Nothing to drag when Unscheduled is empty: the step can be skipped.
    skipOn: 'step-skipped',
  },
  {
    id: 'cal-block',
    titleKey: 'onboarding.tourCalBlockTitle',
    bodyKey: 'onboarding.tourCalBlockBody',
    anchor: anchorTo('calendar-grid'),
    offscreen: 'view:calendar',
    doneOn: 'block-created',
  },
  info(
    'cal-filter',
    {
      titleKey: 'onboarding.tourCalFilterTitle',
      bodyKey: 'onboarding.tourCalFilterBody',
    },
    anchorTo('calendar-filter'),
    'view:calendar',
  ),
  chapterFinish('calendar-finish'),
]

/** Timer: modes, start and stop, the history list, and the away prompt. */
const TIMER_STEPS: readonly TourStep[] = [
  {
    id: 'timer-open',
    sidebar: true,
    titleKey: 'onboarding.tourTimerOpenTitle',
    bodyKey: 'onboarding.tourTimerOpenBody',
    anchor: anchorTo('nav-timer'),
    offscreen: 'drawer',
    doneOn: 'view-opened',
    check: (payload) => payload.view === 'timer',
  },
  {
    id: 'timer-mode',
    titleKey: 'onboarding.tourTimerModeTitle',
    bodyKey: 'onboarding.tourTimerModeBody',
    anchor: anchorTo('timer-mode'),
    offscreen: 'view:timer',
    doneOn: 'timer-mode-changed',
  },
  {
    id: 'timer-start',
    titleKey: 'onboarding.tourTimerStartTitle',
    bodyKey: 'onboarding.tourTimerStartBody',
    anchor: anchorTo('timer-controls'),
    offscreen: 'view:timer',
    doneOn: 'timer-started',
  },
  {
    id: 'timer-stop',
    titleKey: 'onboarding.tourTimerStopTitle',
    bodyKey: 'onboarding.tourTimerStopBody',
    anchor: anchorTo('timer-controls'),
    offscreen: 'view:timer',
    doneOn: 'timer-stopped',
  },
  info(
    'timer-history',
    {
      titleKey: 'onboarding.tourTimerHistoryTitle',
      bodyKey: 'onboarding.tourTimerHistoryBody',
    },
    anchorTo('timer-history'),
    'view:timer',
  ),
  info(
    'timer-away',
    {
      titleKey: 'onboarding.tourTimerAwayTitle',
      bodyKey: 'onboarding.tourTimerAwayBody',
    },
    null,
  ),
  chapterFinish('timer-finish'),
]

/** Habits: a repeating task, the project's Habits card, and the Habits tab. */
const HABITS_STEPS: readonly TourStep[] = [
  {
    id: 'habit-schedule',
    titleKey: 'onboarding.tourHabitScheduleTitle',
    bodyKey: 'onboarding.tourHabitScheduleBody',
    anchor: anchorTo('composer-calendar'),
    offscreen: 'view:goals',
    doneOn: 'schedule-opened',
  },
  {
    id: 'habit-repeat',
    titleKey: 'onboarding.tourHabitRepeatTitle',
    bodyKey: 'onboarding.tourHabitRepeatBody',
    anchor: anchorTo('composer-repeat'),
    offscreen: 'view:goals',
    doneOn: 'task-repeats',
  },
  info(
    'habit-card',
    {
      titleKey: 'onboarding.tourHabitCardTitle',
      bodyKey: 'onboarding.tourHabitCardBody',
    },
    anchorTo('habit-card'),
    'view:goals',
  ),
  {
    id: 'habit-tab',
    titleKey: 'onboarding.tourHabitTabTitle',
    bodyKey: 'onboarding.tourHabitTabBody',
    anchor: anchorTo('analytics-tabs'),
    offscreen: 'view:analytics',
    doneOn: 'analytics-tab',
    check: (payload) => payload.tab === 'habits',
  },
  chapterFinish('habits-finish'),
]

/** Money: rates, clients and budgets in settings; the Money tab and export in Analytics. */
const MONEY_STEPS: readonly TourStep[] = [
  info(
    'money-rate',
    {
      titleKey: 'onboarding.tourMoneyRateTitle',
      bodyKey: 'onboarding.tourMoneyRateBody',
    },
    null,
    'settings:project',
  ),
  info(
    'money-clients',
    {
      titleKey: 'onboarding.tourMoneyClientsTitle',
      bodyKey: 'onboarding.tourMoneyClientsBody',
    },
    null,
    'settings:clients',
  ),
  info(
    'money-budget',
    {
      titleKey: 'onboarding.tourMoneyBudgetTitle',
      bodyKey: 'onboarding.tourMoneyBudgetBody',
    },
    null,
    'settings:project',
  ),
  {
    id: 'money-tab',
    titleKey: 'onboarding.tourMoneyTabTitle',
    bodyKey: 'onboarding.tourMoneyTabBody',
    anchor: anchorTo('analytics-tabs'),
    offscreen: 'view:analytics',
    doneOn: 'analytics-tab',
    check: (payload) => payload.tab === 'money',
  },
  info(
    'money-export',
    {
      titleKey: 'onboarding.tourMoneyExportTitle',
      bodyKey: 'onboarding.tourMoneyExportBody',
    },
    anchorTo('analytics-export'),
    'analytics:money',
  ),
  chapterFinish('money-finish'),
]

/**
 * Shortcuts: the keyboard steps are skipped on touch, and each has a touch
 * twin that points at the top-bar buttons. Reorder and menus differ by gesture.
 */
const SHORTCUTS_STEPS: readonly TourStep[] = [
  {
    id: 'short-quick-key',
    keyboardOnly: true,
    titleKey: 'onboarding.tourShortQuickKeyTitle',
    bodyKey: 'onboarding.tourShortQuickKeyBody',
    anchor: null,
    doneOn: 'quick-add-opened',
  },
  {
    id: 'short-quick-touch',
    touchOnly: true,
    titleKey: 'onboarding.tourShortQuickTouchTitle',
    bodyKey: 'onboarding.tourShortQuickTouchBody',
    anchor: anchorTo('top-quick-add'),
    doneOn: 'quick-add-opened',
  },
  {
    id: 'short-dates',
    titleKey: 'onboarding.tourShortDatesTitle',
    bodyKey: 'onboarding.tourShortDatesBody',
    anchor: null,
    doneOn: 'quick-add-used',
    check: (payload) => payload.dated === true,
  },
  {
    id: 'short-search-key',
    keyboardOnly: true,
    titleKey: 'onboarding.tourShortSearchKeyTitle',
    bodyKey: 'onboarding.tourShortSearchKeyBody',
    anchor: null,
    doneOn: 'search-opened',
  },
  {
    id: 'short-search-touch',
    touchOnly: true,
    titleKey: 'onboarding.tourShortSearchTouchTitle',
    bodyKey: 'onboarding.tourShortSearchTouchBody',
    anchor: anchorTo('top-search'),
    doneOn: 'search-opened',
  },
  {
    id: 'short-reorder',
    sidebar: true,
    titleKey: 'onboarding.tourShortReorderTitle',
    bodyKey: 'onboarding.tourShortReorderBody',
    touchBodyKey: 'onboarding.tourShortReorderTouchBody',
    anchor: anchorTo('sidebar-project'),
    offscreen: 'drawer',
    doneOn: 'next',
  },
  info(
    'short-menu',
    {
      titleKey: 'onboarding.tourShortMenuTitle',
      bodyKey: 'onboarding.tourShortMenuBody',
      touchBodyKey: 'onboarding.tourShortMenuTouchBody',
    },
    anchorTo('task-row'),
    'view:goals',
  ),
  {
    id: 'short-help',
    sidebar: true,
    titleKey: 'onboarding.tourShortHelpTitle',
    bodyKey: 'onboarding.tourShortHelpBody',
    touchBodyKey: 'onboarding.tourShortHelpTouchBody',
    anchor: anchorTo('help-button'),
    offscreen: 'drawer',
    doneOn: 'help-opened',
  },
  chapterFinish('shortcuts-finish'),
]

/** Settings: the info steps that open each part of the settings panel. */
const SETTINGS_STEPS: readonly TourStep[] = [
  info(
    'set-language',
    {
      titleKey: 'onboarding.tourSetLanguageTitle',
      bodyKey: 'onboarding.tourSetLanguageBody',
    },
    null,
    'settings:format',
  ),
  info(
    'set-theme',
    {
      titleKey: 'onboarding.tourSetThemeTitle',
      bodyKey: 'onboarding.tourSetThemeBody',
    },
    null,
    'settings:theme',
  ),
  info(
    'set-start',
    {
      titleKey: 'onboarding.tourSetStartTitle',
      bodyKey: 'onboarding.tourSetStartBody',
    },
    null,
    'settings:behavior',
  ),
  info(
    'set-account',
    {
      titleKey: 'onboarding.tourSetAccountTitle',
      bodyKey: 'onboarding.tourSetAccountBody',
    },
    null,
    'profile',
  ),
  chapterFinish('settings-finish'),
]

/** Every step, in no particular order; the chapters below set the order. */
export const TOUR_STEPS: readonly TourStep[] = [
  ...BASICS_STEPS,
  ...SCHEDULING_STEPS,
  ...CALENDAR_STEPS,
  ...TIMER_STEPS,
  ...HABITS_STEPS,
  ...MONEY_STEPS,
  ...SHORTCUTS_STEPS,
  ...SETTINGS_STEPS,
]

/** The steps of Basics' default path: the board is optional, so the widget path is the alternative. */
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

const idsOf = (steps: readonly TourStep[]): TourStepId[] =>
  steps.map((step) => step.id)

/** The chapters in the order the list shows them and "Next chapter" follows. */
export const TOUR_CHAPTERS: readonly TourChapter[] = [
  {
    id: 'basics',
    titleKey: 'onboarding.chapterBasics',
    defaultPath: 'board',
    paths: { board: BOARD_PATH, widget: WIDGET_PATH },
  },
  {
    id: 'scheduling',
    titleKey: 'onboarding.chapterScheduling',
    defaultPath: 'main',
    paths: { main: idsOf(SCHEDULING_STEPS) },
  },
  {
    id: 'calendar',
    titleKey: 'onboarding.chapterCalendar',
    defaultPath: 'main',
    paths: { main: idsOf(CALENDAR_STEPS) },
  },
  {
    id: 'timer',
    titleKey: 'onboarding.chapterTimer',
    defaultPath: 'main',
    paths: { main: idsOf(TIMER_STEPS) },
  },
  {
    id: 'habits',
    titleKey: 'onboarding.chapterHabits',
    defaultPath: 'main',
    paths: { main: idsOf(HABITS_STEPS) },
  },
  {
    id: 'money',
    titleKey: 'onboarding.chapterMoney',
    defaultPath: 'main',
    paths: { main: idsOf(MONEY_STEPS) },
  },
  {
    id: 'shortcuts',
    titleKey: 'onboarding.chapterShortcuts',
    defaultPath: 'main',
    paths: { main: idsOf(SHORTCUTS_STEPS) },
  },
  {
    id: 'settings',
    titleKey: 'onboarding.chapterSettings',
    defaultPath: 'main',
    paths: { main: idsOf(SETTINGS_STEPS) },
  },
]

export const TOUR_CHAPTER_BY_ID: Readonly<Record<ChapterId, TourChapter>> =
  Object.fromEntries(
    TOUR_CHAPTERS.map((chapter) => [chapter.id, chapter]),
  ) as Record<ChapterId, TourChapter>

export const TOUR_STEP_BY_ID: Readonly<Record<TourStepId, TourStep>> =
  Object.fromEntries(TOUR_STEPS.map((step) => [step.id, step])) as Record<
    TourStepId,
    TourStep
  >
