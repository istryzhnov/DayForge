/** Screens a tip can sit on: the app views, plus the sidebar's project list. */
export type TipView =
  | 'goals'
  | 'calendar'
  | 'planned'
  | 'archive'
  | 'timer'
  | 'analytics'
  | 'sidebar'

/** Which side of the control the bubble sits on. The arrow points back at it. */
export type TipPlacement = 'bottom' | 'top' | 'right' | 'left'

/** Counts the tips read to decide whether a bubble still fits the data. */
export interface TipFacts {
  taskCount: number
  projectCount: number
  inProject: boolean
}

export interface Tip {
  id: string
  view: TipView
  /** Matches a `data-tip-anchor` value on the control the tip explains. */
  anchor: string
  placement?: TipPlacement
  title: string
  body: string
  /** Replaces body where the gesture differs, e.g. long-press on a phone. */
  touchBody?: string
  /** A tip that only makes sense with a mouse and a wide screen, or only on a phone. */
  only?: 'desktop' | 'mobile'
  action?: { label: string }
  when?: (facts: TipFacts) => boolean
}

/**
 * Ordered: within a view the first tip that is undismissed, passes `when`, and
 * whose anchor is on screen is the one shown. Goals tips come before the
 * sidebar tip, so the composer is explained first.
 */
export const TIPS: readonly Tip[] = [
  {
    id: 'first-task',
    view: 'goals',
    anchor: 'composer-input',
    title: "Type what you're working on",
    body: 'A couple of words is enough. You can edit it anytime.',
    action: { label: 'Use a template' },
    when: (facts) => facts.taskCount === 0,
  },
  {
    id: 'add-to-project',
    view: 'goals',
    anchor: 'composer-project',
    title: 'Add it to a project',
    body: 'Grouping by project keeps your list and reports tidy.',
  },
  {
    id: 'give-a-date',
    view: 'goals',
    anchor: 'composer-calendar',
    title: 'Give it a date',
    body: 'Dated tasks move to Planned and show up on their day.',
  },
  {
    id: 'nest-tasks',
    view: 'goals',
    anchor: 'task-row',
    title: 'Tasks can hold tasks',
    body: 'Right-click a task to make it a project, or press + to add steps.',
    touchBody: 'Long-press a task to make it a project, or tap + to add steps.',
    when: (facts) => facts.taskCount > 0,
  },
  {
    id: 'project-filter',
    view: 'sidebar',
    anchor: 'sidebar-project',
    placement: 'right',
    title: 'Projects filter the list',
    body: 'Pick a project to see only its tasks. Drag its grip to reorder.',
    // On a phone the list sits in a closed drawer, so there is nothing to point at.
    only: 'desktop',
    when: (facts) => facts.projectCount > 0,
  },
  {
    id: 'timer-modes',
    view: 'timer',
    anchor: 'timer-mode',
    title: 'Stopwatch, countdown, pomodoro',
    body: 'Stopwatch counts up, countdown runs to a length you pick, pomodoro alternates focus and breaks.',
  },
  {
    id: 'timer-length',
    view: 'timer',
    anchor: 'timer-lengths',
    title: 'Pick a length',
    body: 'Tap a chip or type your own minutes.',
  },
  {
    id: 'calendar-time',
    view: 'calendar',
    anchor: 'calendar-toolbar',
    placement: 'bottom',
    title: 'Give tasks a time',
    body: 'Drag a task onto the day grid, or draw a block on empty space.',
    touchBody:
      'Long-press a task and drag it onto the day grid, or draw a block.',
  },
  {
    id: 'analytics-tabs',
    view: 'analytics',
    anchor: 'analytics-tabs',
    title: 'Three ways to read',
    body: 'Time, Money and Habits each answer one question about your work.',
  },
  {
    id: 'planned-dates',
    view: 'planned',
    anchor: 'planned-header',
    title: 'Dated tasks wait here',
    body: 'Tasks with a date sit here until their day, so nothing gets lost.',
  },
  {
    id: 'archive-done',
    view: 'archive',
    anchor: 'archive-header',
    title: 'Everything you finished',
    body: 'What I did lists finished tasks by day, so you can see how a week went.',
  },
]
