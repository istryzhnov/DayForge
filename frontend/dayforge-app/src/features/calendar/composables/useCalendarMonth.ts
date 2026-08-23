import { computed, ref } from 'vue'
import type { DailyTask, TaskTemplate } from '../../../entities/TaskEntity'
import type { ISODate } from '../../../entities/types'
import {
  addDaysToISODate,
  addMonthsToISODate,
  getTodayISODate,
  startOfMonthISODate,
  weekdayOfISODate,
} from '../../../composables/goalSpace/date'
import {
  collectDayEvents,
  groupRowsByDate,
  scheduledMinutesOf,
  type DayEvent,
} from './useCalendarOccurrences'
import { useSettings } from '../../../composables/useSettings'
import { useFormat } from '../../../composables/useFormat'

/** Six weeks always fit a month, so the grid never changes height. */
const GRID_WEEKS = 6
const DAYS_PER_WEEK = 7

export type MonthEvent = DayEvent

export type MonthDayCell = {
  date: ISODate
  dayNumber: number
  isToday: boolean
  isCurrentMonth: boolean
  events: MonthEvent[]
  totalCount: number
  doneCount: number
  scheduledMinutes: number
  /** 0–4 bucket used to tint the cell by how booked the day is. */
  loadLevel: number
}

type MonthOptions = {
  getTemplates: () => TaskTemplate[]
  getDailyTasks: () => DailyTask[]
  /** Day the rest of the app is on; the month opens around it. */
  getCurrentDate: () => ISODate
}

/** `fullDayMinutes` is what the user calls a full day — the scale the cell
 *  tint is measured against. */
function loadLevelFor(
  minutes: number,
  taskCount: number,
  fullDayMinutes: number,
): number {
  if (taskCount === 0) return 0
  if (minutes === 0) return 1
  const ratio = minutes / fullDayMinutes
  if (ratio >= 1) return 4
  if (ratio >= 0.6) return 3
  return 2
}

export function useCalendarMonth(options: MonthOptions) {
  const { settings } = useSettings()
  const { formatMonth, weekdayLabels } = useFormat()

  // Which month is on screen. Follows `currentDate` until the user pages away.
  const monthAnchor = ref<ISODate | null>(null)

  const anchor = computed(
    () => monthAnchor.value ?? startOfMonthISODate(options.getCurrentDate()),
  )

  const monthLabel = computed(() => formatMonth(anchor.value))

  const days = computed<MonthDayCell[]>(() => {
    const templates = options.getTemplates()
    const dailyTasks = options.getDailyTasks()
    const today = getTodayISODate()
    const monthStart = startOfMonthISODate(anchor.value)
    const monthNumber = Number(monthStart.split('-')[1])

    // The grid starts on the configured first day of the week, on or before
    // the 1st (getDay: 0 = Sunday).
    const weekStart = settings.calendar.weekStartsOn
    const leadingDays = (weekdayOfISODate(monthStart) - weekStart + 7) % 7
    const gridStart = addDaysToISODate(monthStart, -leadingDays)

    const rowsByDate = groupRowsByDate(dailyTasks)
    const cells: MonthDayCell[] = []

    for (let index = 0; index < GRID_WEEKS * DAYS_PER_WEEK; index += 1) {
      const date = addDaysToISODate(gridStart, index)
      const events = collectDayEvents({ templates, rowsByDate, date })
      const scheduledMinutes = scheduledMinutesOf(events)
      const doneCount = events.filter((event) => event.isDone).length

      cells.push({
        date,
        dayNumber: Number(date.split('-')[2]),
        isToday: date === today,
        isCurrentMonth: Number(date.split('-')[1]) === monthNumber,
        events,
        totalCount: events.length,
        doneCount,
        scheduledMinutes,
        loadLevel: loadLevelFor(
          scheduledMinutes,
          events.length,
          settings.calendar.fullDayHours * 60,
        ),
      })
    }

    return cells
  })

  const monthSummary = computed(() => {
    const inMonth = days.value.filter((day) => day.isCurrentMonth)
    return {
      tasks: inMonth.reduce((sum, day) => sum + day.totalCount, 0),
      hours: Math.round(
        inMonth.reduce((sum, day) => sum + day.scheduledMinutes, 0) / 60,
      ),
      busiestDay: inMonth.reduce<MonthDayCell | null>(
        (busiest, day) =>
          !busiest || day.scheduledMinutes > busiest.scheduledMinutes
            ? day
            : busiest,
        null,
      ),
    }
  })

  function goToPreviousMonth() {
    monthAnchor.value = addMonthsToISODate(anchor.value, -1)
  }

  function goToNextMonth() {
    monthAnchor.value = addMonthsToISODate(anchor.value, 1)
  }

  function goToMonthOf(date: ISODate) {
    monthAnchor.value = startOfMonthISODate(date)
  }

  /**
   * Jump to the month containing the real today — not the month of whatever day
   * happens to be selected, which is what a plain anchor reset would do.
   */
  function goToTodayMonth() {
    monthAnchor.value = startOfMonthISODate(getTodayISODate())
  }

  return {
    anchor,
    monthLabel,
    weekdayLabels,
    days,
    monthSummary,
    goToPreviousMonth,
    goToNextMonth,
    goToMonthOf,
    goToTodayMonth,
  }
}
