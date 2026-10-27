import { computed, type Ref } from 'vue'
import type { DailyTask } from '../entities/TaskEntity'
import type { ID, ISODate } from '../entities/types'
import {
  PRIORITY,
  PROGRESS_SCOPE_TYPE,
  TASK_STATUS,
} from '../entities/constants'

export type ProgressScope =
  | { type: typeof PROGRESS_SCOPE_TYPE.ALL }
  | { type: typeof PROGRESS_SCOPE_TYPE.GOAL; goalId: ID }
  | { type: typeof PROGRESS_SCOPE_TYPE.MAJOR; majorDailyTaskId: ID }

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

function percent(done: number, total: number): number {
  if (total <= 0) return 0
  return clampPercent((done / total) * 100)
}

function calcMajorDayProgress(dayTasks: DailyTask[], majorDailyTaskId: ID) {
  const major = dayTasks.find(
    (t) => t.id === majorDailyTaskId && t.priority === PRIORITY.MAJOR,
  )
  if (!major) return { done: 0, total: 0, percent: 0 }

  const minors = dayTasks.filter(
    (t) =>
      t.parentDailyTaskId === majorDailyTaskId && t.priority === PRIORITY.MINOR,
  )

  const done = minors.filter((t) => t.status === TASK_STATUS.DONE).length
  const total = minors.length

  return { done, total, percent: percent(done, total) }
}

function calcGoalDayProgress(dayTasks: DailyTask[], goalId: ID) {
  const scoped = dayTasks.filter((t) => t.goalId === goalId)
  const done = scoped.filter((t) => t.status === TASK_STATUS.DONE).length
  const total = scoped.length

  return { done, total, percent: percent(done, total) }
}

function calcAllDayProgress(dayTasks: DailyTask[]) {
  const done = dayTasks.filter((t) => t.status === TASK_STATUS.DONE).length
  const total = dayTasks.length

  return { done, total, percent: percent(done, total) }
}

/** Today's tasks in scope, repeating or not. Habit numbers live in habits.ts. */
export function useProgressMetrics(
  dailyTasks: Ref<DailyTask[]>,
  today: Ref<ISODate>,
  scope: Ref<ProgressScope>,
) {
  const todayProgress = computed(() => {
    const todayTasks = dailyTasks.value.filter((t) => t.date === today.value)

    if (scope.value.type === PROGRESS_SCOPE_TYPE.MAJOR) {
      return calcMajorDayProgress(todayTasks, scope.value.majorDailyTaskId)
    }
    if (scope.value.type === PROGRESS_SCOPE_TYPE.GOAL) {
      return calcGoalDayProgress(todayTasks, scope.value.goalId)
    }

    return calcAllDayProgress(todayTasks)
  })

  return {
    todayProgress,
  }
}
