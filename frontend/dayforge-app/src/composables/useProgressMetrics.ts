import { computed, type Ref } from 'vue'
import type { DailyTask } from '../entities/TaskEntity'
import type { ID, ISODate } from '../entities/types'

export type ProgressScope =
  | { type: 'all' }
  | { type: 'goal'; goalId: ID }
  | { type: 'major'; majorDailyTaskId: ID }

export type HabitDayCell = {
  date: ISODate
  percent: number
  done: number
  total: number
  isToday: boolean
}

function toISODate(date: Date): ISODate {
  return date.toISOString().slice(0, 10) as ISODate
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

function percent(done: number, total: number): number {
  if (total <= 0) return 0
  return clampPercent((done / total) * 100)
}

function getDaysInMonth(baseDateISO: ISODate): ISODate[] {
  const [y, m] = baseDateISO.split('-').map(Number)
  const first = new Date(y, m - 1, 1)
  const last = new Date(y, m, 0)
  const days: ISODate[] = []

  for (let d = first.getDate(); d <= last.getDate(); d += 1) {
    days.push(toISODate(new Date(y, m - 1, d)))
  }

  return days
}

function calcMajorDayProgress(dayTasks: DailyTask[], majorDailyTaskId: ID) {
  const major = dayTasks.find(
    (t) => t.id === majorDailyTaskId && t.priority === 'major',
  )
  if (!major) return { done: 0, total: 0, percent: 0 }

  const minors = dayTasks.filter(
    (t) => t.parentDailyTaskId === majorDailyTaskId && t.priority === 'minor',
  )

  const done = minors.filter((t) => t.status === 'done').length
  const total = minors.length

  return { done, total, percent: percent(done, total) }
}

function calcGoalDayProgress(dayTasks: DailyTask[], goalId: ID) {
  const scoped = dayTasks.filter((t) => t.goalId === goalId)
  const done = scoped.filter((t) => t.status === 'done').length
  const total = scoped.length

  return { done, total, percent: percent(done, total) }
}

function calcAllDayProgress(dayTasks: DailyTask[]) {
  const done = dayTasks.filter((t) => t.status === 'done').length
  const total = dayTasks.length

  return { done, total, percent: percent(done, total) }
}

export function useProgressMetrics(
  dailyTasks: Ref<DailyTask[]>,
  currentDate: Ref<ISODate>,
  scope: Ref<ProgressScope>,
) {
  const todayProgress = computed(() => {
    const todayTasks = dailyTasks.value.filter(
      (t) => t.date === currentDate.value,
    )

    if (scope.value.type === 'major') {
      return calcMajorDayProgress(todayTasks, scope.value.majorDailyTaskId)
    }
    if (scope.value.type === 'goal') {
      return calcGoalDayProgress(todayTasks, scope.value.goalId)
    }

    return calcAllDayProgress(todayTasks)
  })

  const monthCells = computed<HabitDayCell[]>(() => {
    const monthDays = getDaysInMonth(currentDate.value)
    const today = currentDate.value

    return monthDays.map((dayISO) => {
      const dayTasks = dailyTasks.value.filter((t) => t.date === dayISO)

      let result: { done: number; total: number; percent: number }

      if (scope.value.type === 'major') {
        result = calcMajorDayProgress(dayTasks, scope.value.majorDailyTaskId)
      } else if (scope.value.type === 'goal') {
        result = calcGoalDayProgress(dayTasks, scope.value.goalId)
      } else {
        result = calcAllDayProgress(dayTasks)
      }

      return {
        date: dayISO,
        done: result.done,
        total: result.total,
        percent: Number(result.percent.toFixed(2)),
        isToday: dayISO === today,
      }
    })
  })
  return {
    todayProgress,
    monthCells,
  }
}
