import type { ID } from '../../entities/types'
import type { BoardStage } from '../../entities/constants'

/**
 * Things the user did that other parts of the app may react to. The code that
 * sees the action reports it here; it does not know who listens. Today the
 * getting-started tour is the listener: each tour step waits for one of these.
 *
 * Kept free of Vue so the sync harness can compile the tour rules that use
 * these types.
 */
export type UserAction =
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

export interface UserActionPayload {
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

export type UserActionListener = (
  action: UserAction,
  payload: UserActionPayload,
) => void

const listeners = new Set<UserActionListener>()

/**
 * Tells every listener, in the order they subscribed, that the user did
 * something. Runs synchronously, so a listener sees the action before the
 * caller goes on. A listener that throws is logged and skipped: a broken
 * listener must not break the action that was reported.
 */
export function reportUserAction(
  action: UserAction,
  payload: UserActionPayload = {},
) {
  for (const listener of [...listeners]) {
    try {
      listener(action, payload)
    } catch (error) {
      console.error(`[userActions] listener failed on "${action}"`, error)
    }
  }
}

/** Starts listening. Returns the function that stops it. */
export function onUserAction(listener: UserActionListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
