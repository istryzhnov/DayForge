import { inject, provide, type InjectionKey } from 'vue'
import type { TaskSchedule } from '../../../entities/TaskEntity'
import type { BoardStage } from '../../../entities/constants'
import type { ID, ISODate, Priority } from '../../../entities/types'
import type { TaskDropPayload } from './useTaskDrag'

/**
 * Everything a task row, a board card or a dialog can do to a task.
 *
 * The page owns the data and provides these once; any component below it asks
 * for them here. A row five levels down therefore calls `actions.remove(id)`
 * itself, instead of every component in between declaring and re-emitting the
 * same event. Events stay for what a parent actually reacts to (open, close,
 * select) — a change to the data goes through here.
 */
export interface TaskActions {
  /** Adds a task to the project on screen. */
  addTask(title: string, priority: Priority, schedule?: TaskSchedule): void
  addSubtask(
    parentTemplateId: ID,
    title: string,
    priority: Priority,
    schedule?: TaskSchedule,
  ): void
  /** All Projects has no project on screen, so the composer names the target. */
  addInAllMode(
    title: string,
    goalId?: ID,
    majorId?: ID,
    schedule?: TaskSchedule,
  ): void
  toggleDone(dailyTaskId: ID): void
  /** Ticks the task on a day it may have no row on yet. */
  togglePlanned(templateId: ID, date: ISODate): void
  editTitle(templateId: ID, title: string): void
  editNotes(templateId: ID, notes: string): void
  /** `null` takes the task off the calendar. */
  schedule(templateId: ID, schedule: TaskSchedule | null): void
  setRate(templateId: ID, hourlyRate: number | undefined): void
  remove(templateId: ID): void
  setAsProject(templateId: ID): void
  assignGoal(templateId: ID, goalId: ID | undefined): void
  attachToProject(templateId: ID, projectTemplateId: ID | null): void
  /** A dropped row: new project and new position in one go. */
  moveTo(payload: TaskDropPayload): void
  nudge(templateId: ID, step: -1 | 1): void
  setBoardStage(templateId: ID, stage: BoardStage | undefined): void
  clearBoardDone(templateIds: ID[]): void
}

const TASK_ACTIONS_KEY: InjectionKey<TaskActions> = Symbol('task-actions')

export function provideTaskActions(actions: TaskActions) {
  provide(TASK_ACTIONS_KEY, actions)
}

export function useTaskActions(): TaskActions {
  const actions = inject(TASK_ACTIONS_KEY)
  if (!actions) {
    throw new Error(
      'useTaskActions() needs provideTaskActions() in a parent component',
    )
  }
  return actions
}
