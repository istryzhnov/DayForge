import { computed, ref } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { DailyTask, TaskTemplate } from '../../../entities/TaskEntity'
import type { ID, ISODate } from '../../../entities/types'
import {
  addMonthsToISODate,
  getTodayISODate,
  parseISODate,
  startOfMonthISODate,
} from '../../../composables/goalSpace/date'
import {
  habitMonthView,
  type HabitDayState,
  type HabitMonthCell,
  type HabitMonthDayTotal,
} from '../../../composables/analytics/habits'
import { useFormat } from '../../../composables/useFormat'
import { isRepeating } from '../../../composables/goalSpace/recurrence'

const STATE_WORDS: Record<HabitDayState, string> = {
  done: 'done',
  missed: 'missed',
  pending: 'not done yet',
  upcoming: 'upcoming',
  off: 'not scheduled',
}

export interface HabitMonthSources {
  getGoals: () => Goal[]
  getTemplates: () => TaskTemplate[]
  getDailyTasks: () => DailyTask[]
}

function weekIndexOf(date: ISODate): number {
  return (parseISODate(date).getDay() + 6) % 7
}

export function useHabitMonth(sources: HabitMonthSources) {
  const { formatDate, formatMonth, locale } = useFormat()

  const currentMonth = startOfMonthISODate(getTodayISODate())
  const month = ref<ISODate>(currentMonth)
  const canGoNext = computed(() => month.value < currentMonth)
  const monthLabel = computed(() => formatMonth(month.value))

  function shiftMonth(delta: number) {
    const next = addMonthsToISODate(month.value, delta)
    if (next > currentMonth) return
    month.value = next
  }

  const view = computed(() =>
    habitMonthView({
      templates: sources.getTemplates(),
      dailyTasks: sources.getDailyTasks(),
      month: month.value,
      today: getTodayISODate(),
    }),
  )

  const hasRepeating = computed(() =>
    sources.getTemplates().some(isRepeating),
  )

  const weekdayLabels = computed(() =>
    Array.from({ length: 7 }, (_, index) =>
      new Date(2024, 0, 1 + index).toLocaleDateString(locale.value, {
        weekday: 'short',
      }),
    ),
  )

  const calendarCells = computed<(HabitMonthDayTotal | null)[]>(() => {
    const days = view.value.dayTotals
    if (days.length === 0) return []

    const leading: null[] = Array.from(
      { length: weekIndexOf(days[0].date) },
      () => null,
    )
    const cells: (HabitMonthDayTotal | null)[] = [...leading, ...days]
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  })

  const projectById = computed(
    () =>
      new Map<ID, Goal>(sources.getGoals().map((goal) => [goal.id, goal])),
  )

  function colorOf(goalId?: ID): string | undefined {
    if (!goalId) return undefined
    return projectById.value.get(goalId)?.theme?.accent
  }

  function projectNameOf(goalId?: ID): string {
    if (!goalId) return ''
    return projectById.value.get(goalId)?.title ?? 'Deleted project'
  }

  function dateText(date: ISODate): string {
    return formatDate(date, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  }

  function cellLabel(cell: HabitMonthCell): string {
    return `${dateText(cell.date)} — ${STATE_WORDS[cell.state]}`
  }

  function dayLabel(day: HabitMonthDayTotal): string {
    if (day.date > getTodayISODate()) {
      const state = day.total ? 'upcoming' : 'nothing scheduled'
      return `${dateText(day.date)} — ${state}`
    }
    if (day.total === 0) return `${dateText(day.date)} — nothing scheduled`
    return `${dateText(day.date)} — ${day.done} of ${day.total} done`
  }

  function dayTone(day: HabitMonthDayTotal): string {
    if (day.total === 0) return 'off'
    if (day.date > getTodayISODate()) return 'upcoming'
    if (day.done === day.total) return 'full'
    if (day.done === 0) return 'missed'
    return 'partial'
  }

  function dayNumberOf(date: ISODate): number {
    return parseISODate(date).getDate()
  }

  function percentLabel(rate: number | null): string {
    return rate === null ? '—' : `${Math.round(rate * 100)}%`
  }

  return {
    month,
    monthLabel,
    canGoNext,
    shiftMonth,
    view,
    hasRepeating,
    weekdayLabels,
    calendarCells,
    colorOf,
    projectNameOf,
    cellLabel,
    dayLabel,
    dayTone,
    dayNumberOf,
    percentLabel,
  }
}
