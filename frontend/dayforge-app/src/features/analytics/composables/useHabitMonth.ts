import { computed, ref } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { DailyTask, TaskTemplate } from '../../../entities/TaskEntity'
import type { ID, ISODate } from '../../../entities/types'
import {
  addDaysToISODate,
  addMonthsToISODate,
  getTodayISODate,
  parseISODate,
  startOfMonthISODate,
} from '../../../composables/goalSpace/date'
import {
  habitMonthView,
  habitStreaks,
  habitStripCells,
  type HabitDayState,
  type HabitMonthCell,
  type HabitMonthDayTotal,
  type HabitMonthRow,
} from '../../../composables/analytics/habits'
import { isRepeating } from '../../../composables/goalSpace/recurrence'
import { panelDateLabel } from '../../../composables/panelDateLabel'
import { projectColors } from '../../../composables/theme/goalTheme'
import { i18n } from '../../../i18n'

/** Message keys for each day state, read at call time so the language follows. */
const STATE_KEYS: Record<HabitDayState, string> = {
  done: 'analytics.habitDone',
  missed: 'analytics.habitMissed',
  pending: 'analytics.habitPending',
  upcoming: 'analytics.habitUpcoming',
  off: 'analytics.habitOff',
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
  const currentMonth = startOfMonthISODate(getTodayISODate())
  const month = ref<ISODate>(currentMonth)
  const canGoNext = computed(() => month.value < currentMonth)
  const monthLabel = computed(() =>
    panelDateLabel(month.value, { month: 'long', year: 'numeric' }),
  )

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

  const hasRepeating = computed(() => sources.getTemplates().some(isRepeating))

  /** Current run of done days per habit, the same numbers as the project page. */
  const streaks = computed(() =>
    habitStreaks({
      templates: sources.getTemplates(),
      dailyTasks: sources.getDailyTasks(),
      today: getTodayISODate(),
    }),
  )

  function streakOf(templateId: ID): number {
    return streaks.value.get(templateId) ?? 0
  }

  /** Squares for one row, cut at today; every row has the same length. */
  function stripCellsOf(row: HabitMonthRow): HabitMonthCell[] {
    return habitStripCells(row.cells, getTodayISODate())
  }

  // Monday first, narrow names: M T W T F S S.
  const weekdayLabels = computed(() =>
    Array.from({ length: 7 }, (_, index) =>
      panelDateLabel(addDaysToISODate('2024-01-01', index), {
        weekday: 'narrow',
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
    () => new Map<ID, Goal>(sources.getGoals().map((goal) => [goal.id, goal])),
  )

  const colorById = computed(() => projectColors(sources.getGoals()))

  function colorOf(goalId?: ID): string | undefined {
    if (!goalId) return undefined
    return colorById.value.get(goalId)
  }

  function projectNameOf(goalId?: ID): string {
    if (!goalId) return ''
    return (
      projectById.value.get(goalId)?.title ??
      i18n.global.t('analytics.deletedProject')
    )
  }

  function dateText(date: ISODate): string {
    return panelDateLabel(date, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  }

  function cellLabel(cell: HabitMonthCell): string {
    return i18n.global.t('analytics.habitCell', {
      date: dateText(cell.date),
      state: i18n.global.t(STATE_KEYS[cell.state]),
    })
  }

  function dayLabel(day: HabitMonthDayTotal): string {
    const date = dateText(day.date)
    if (day.date > getTodayISODate()) {
      const state = day.total
        ? i18n.global.t('analytics.habitUpcoming')
        : i18n.global.t('analytics.habitNothing')
      return i18n.global.t('analytics.habitCell', { date, state })
    }
    if (day.total === 0) {
      return i18n.global.t('analytics.habitCell', {
        date,
        state: i18n.global.t('analytics.habitNothing'),
      })
    }
    return i18n.global.t('analytics.habitDay', {
      date,
      done: day.done,
      total: day.total,
    })
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
    streakOf,
    stripCellsOf,
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
