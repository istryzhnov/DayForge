import { vi } from 'vitest'
import type { Goal } from '../../src/entities/GoalEntity'
import type { TaskSchedule } from '../../src/entities/TaskEntity'
import type { ISODate } from '../../src/entities/types'
import type { RecurrenceType } from '../../src/entities/RecurrenceEntity'

/** The day every test starts on: a Wednesday, mid-morning. */
export const TODAY: ISODate = '2026-09-02'
export const YESTERDAY: ISODate = '2026-09-01'
export const TOMORROW: ISODate = '2026-09-03'

const stops: Array<() => void> = []

/** Fresh storage and a fixed clock. Call from beforeEach. */
export function resetWorld() {
  vi.useFakeTimers({ now: new Date(`${TODAY}T10:00:00`) })
  localStorage.clear()
}

/** Stops every workspace a test opened. Call from afterEach. */
export function closeWorld() {
  stops.splice(0).forEach((stop) => stop())
  vi.useRealTimers()
}

/**
 * Opens the app's data the way a page load does: a new module graph, so the
 * singletons (settings, undo, burials) are rebuilt from what is in storage,
 * then `useGoalSpace()` and its first read. Opening twice in one test is a
 * reload, or a second tab on the same storage.
 */
export async function openWorkspace() {
  vi.resetModules()
  const { effectScope, nextTick } = await import('vue')
  const { useGoalSpace } = await import('../../src/composables/useGoalSpace')
  const { useUndoToast } = await import('../../src/composables/useUndoToast')

  const scope = effectScope()
  const space = scope.run(() => useGoalSpace())!
  stops.push(() => scope.stop())
  space.initializeStorage()

  const undoToast = useUndoToast()

  return {
    space,
    /** Lets the storage watchers write, as the browser would between events. */
    settle: () => nextTick(),
    /** Presses "Undo" on the message that is up. */
    undo: () => undoToast.runPendingAction(),
    hasUndo: () => undoToast.pending.value !== null,
    templateOf: (id: string) =>
      space.taskTemplates.value.find((item) => item.id === id),
    rowOf: (templateId: string, date: ISODate = TODAY) =>
      space.dailyTasks.value.find(
        (row) => row.templateId === templateId && row.date === date,
      ),
    rowsOf: (templateId: string) =>
      space.dailyTasks.value.filter((row) => row.templateId === templateId),
  }
}

export type Workspace = Awaited<ReturnType<typeof openWorkspace>>

export function makeGoal(id: string, overrides: Partial<Goal> = {}): Goal {
  return {
    id,
    title: id,
    description: '',
    status: 'active',
    createdAt: `${YESTERDAY}T08:00:00.000Z`,
    updatedAt: `${YESTERDAY}T08:00:00.000Z`,
    ...overrides,
  }
}

/** A schedule on one day, repeating or not, with an optional time. */
export function on(
  date: ISODate,
  type: RecurrenceType = 'none',
  time?: { startTime: string; endTime: string },
): TaskSchedule {
  return { date, ...time, recurrence: { type, startDate: date } }
}

/** Moves the clock to the next morning and lets the app notice. */
export async function passMidnight(workspace: Workspace) {
  vi.setSystemTime(new Date(`${TOMORROW}T08:00:00`))
  // "Today" is re-read once a minute.
  vi.advanceTimersByTime(60_000)
  await workspace.settle()
}

/** Later stamps than the ones the rows were created with. */
export function tick(ms = 1000) {
  vi.advanceTimersByTime(ms)
}
