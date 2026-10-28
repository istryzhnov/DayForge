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
  /** Message keys: rendered with t() at display time, so a language switch updates them. */
  titleKey: string
  bodyKey: string
  /** Replaces body where the gesture differs, e.g. long-press on a phone. */
  touchBodyKey?: string
  /** A tip that only makes sense with a mouse and a wide screen, or only on a phone. */
  only?: 'desktop' | 'mobile'
  action?: { labelKey: string }
  when?: (facts: TipFacts) => boolean
}

/**
 * Per-screen coach tips are switched off: the getting-started tour covers the
 * first steps, and tips popping up on every visit got in the way. The code
 * stays; set this to true to bring them back (with their settings and Help
 * entries).
 */
export const COACH_TIPS_ENABLED = false

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
    titleKey: 'onboarding.tipFirstTaskTitle',
    bodyKey: 'onboarding.tipFirstTaskBody',
    action: { labelKey: 'onboarding.tipFirstTaskAction' },
    when: (facts) => facts.taskCount === 0,
  },
  {
    id: 'add-to-project',
    view: 'goals',
    anchor: 'composer-project',
    titleKey: 'onboarding.tipAddToProjectTitle',
    bodyKey: 'onboarding.tipAddToProjectBody',
  },
  {
    id: 'give-a-date',
    view: 'goals',
    anchor: 'composer-calendar',
    titleKey: 'onboarding.tipGiveDateTitle',
    bodyKey: 'onboarding.tipGiveDateBody',
  },
  {
    id: 'nest-tasks',
    view: 'goals',
    anchor: 'task-row',
    titleKey: 'onboarding.tipNestTasksTitle',
    bodyKey: 'onboarding.tipNestTasksBody',
    touchBodyKey: 'onboarding.tipNestTasksTouchBody',
    when: (facts) => facts.taskCount > 0,
  },
  {
    id: 'project-filter',
    view: 'sidebar',
    anchor: 'sidebar-project',
    placement: 'right',
    titleKey: 'onboarding.tipProjectFilterTitle',
    bodyKey: 'onboarding.tipProjectFilterBody',
    // On a phone the list sits in a closed drawer, so there is nothing to point at.
    only: 'desktop',
    when: (facts) => facts.projectCount > 0,
  },
  {
    id: 'timer-modes',
    view: 'timer',
    anchor: 'timer-mode',
    titleKey: 'onboarding.tipTimerModesTitle',
    bodyKey: 'onboarding.tipTimerModesBody',
  },
  {
    id: 'timer-length',
    view: 'timer',
    anchor: 'timer-lengths',
    titleKey: 'onboarding.tipTimerLengthTitle',
    bodyKey: 'onboarding.tipTimerLengthBody',
  },
  {
    id: 'calendar-time',
    view: 'calendar',
    anchor: 'calendar-toolbar',
    placement: 'bottom',
    titleKey: 'onboarding.tipCalendarTimeTitle',
    bodyKey: 'onboarding.tipCalendarTimeBody',
    touchBodyKey: 'onboarding.tipCalendarTimeTouchBody',
  },
  {
    id: 'analytics-tabs',
    view: 'analytics',
    anchor: 'analytics-tabs',
    titleKey: 'onboarding.tipAnalyticsTitle',
    bodyKey: 'onboarding.tipAnalyticsBody',
  },
  {
    id: 'planned-dates',
    view: 'planned',
    anchor: 'planned-header',
    titleKey: 'onboarding.tipPlannedTitle',
    bodyKey: 'onboarding.tipPlannedBody',
  },
  {
    id: 'archive-done',
    view: 'archive',
    anchor: 'archive-header',
    titleKey: 'onboarding.tipArchiveTitle',
    bodyKey: 'onboarding.tipArchiveBody',
  },
]
