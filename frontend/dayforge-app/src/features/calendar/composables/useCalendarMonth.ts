import { computed, ref } from 'vue'
import type { DailyTask, TaskTemplate } from '../../../entities/TaskEntity'
import type { ID, ISODate, Priority, TimeOfDay } from '../../../entities/types'
import { TASK_STATUS } from '../../../entities/constants'
import {
  addDaysToISODate,
  addMonthsToISODate,
  getTodayISODate,
  parseISODate,
  startOfMonthISODate,
  weekdayOfISODate,
} from '../../../composables/goalSpace/date'
import { occursOn } from '../../../composables/goalSpace/recurrence'
import { durationMinutes } from './useCalendarGrid'

/** Six weeks always fit a month, so the grid never changes height. */
const GRID_WEEKS = 6
const DAYS_PER_WEEK = 7

/** Scheduled minutes at which a day is considered fully loaded. */
const FULL_DAY_MINUTES = 8 * 60

export type MonthEvent = {
  key: string
  title: string
  startTime?: TimeOfDay
  endTime?: TimeOfDay
  priority: Priority
  isDone: boolean
  /** No row exists yet — projected from the template's recurrence rule. */
  isProjected: boolean
}

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

function loadLevelFor(minutes: number, taskCount: number): number {
  if (taskCount === 0) return 0
  if (minutes === 0) return 1
  const ratio = minutes / FULL_DAY_MINUTES
  if (ratio >= 1) return 4
  if (ratio >= 0.6) return 3
  return 2
}

export function useCalendarMonth(options: MonthOptions) {
  // Which month is on screen. Follows `currentDate` until the user pages away.
  const monthAnchor = ref<ISODate | null>(null)

  const anchor = computed(
    () => monthAnchor.value ?? startOfMonthISODate(options.getCurrentDate()),
  )

  const monthLabel = computed(() =>
    parseISODate(anchor.value).toLocaleDateString('uk-UA', {
      month: 'long',
      year: 'numeric',
    }),
  )

  const weekdayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']

  const days = computed<MonthDayCell[]>(() => {
    const templates = options.getTemplates()
    const dailyTasks = options.getDailyTasks()
    const today = getTodayISODate()
    const monthStart = startOfMonthISODate(anchor.value)
    const monthNumber = Number(monthStart.split('-')[1])

    // Grid starts on the Monday on or before the 1st (getDay: 0 = Sunday).
    const firstWeekday = weekdayOfISODate(monthStart)
    const mondayOffset = (firstWeekday + 6) % 7
    const gridStart = addDaysToISODate(monthStart, -mondayOffset)

    const rowsByDate = new Map<ISODate, DailyTask[]>()
    dailyTasks.forEach((row) => {
      const bucket = rowsByDate.get(row.date)
      if (bucket) bucket.push(row)
      else rowsByDate.set(row.date, [row])
    })

    const cells: MonthDayCell[] = []

    for (let index = 0; index < GRID_WEEKS * DAYS_PER_WEEK; index += 1) {
      const date = addDaysToISODate(gridStart, index)
      const rows = rowsByDate.get(date) ?? []
      const materializedTemplateIds = new Set<ID>(
        rows.map((row) => row.templateId),
      )

      const events: MonthEvent[] = rows.map((row) => ({
        key: row.id,
        title: row.title,
        startTime: row.startTime,
        endTime: row.endTime,
        priority: row.priority,
        isDone: row.status === TASK_STATUS.DONE,
        isProjected: false,
      }))

      // Rows only exist for days the user has opened, so anything further out
      // is projected straight from the recurrence rules. Without this the whole
      // future half of the month would read as empty.
      //
      // `occursOn` is false for open tasks by design — they own one row that
      // rolls forward, so they appear on today only. Projecting them would put
      // every unfinished task on every future day, which made the whole month
      // look booked.
      templates.forEach((template) => {
        if (materializedTemplateIds.has(template.id)) return
        if (!occursOn(template, date)) return

        events.push({
          key: `${template.id}@${date}`,
          title: template.title,
          startTime: template.startTime,
          endTime: template.endTime,
          priority: template.priority,
          isDone: false,
          isProjected: true,
        })
      })

      events.sort((a, b) =>
        (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99'),
      )

      const scheduledMinutes = events.reduce(
        (total, event) =>
          event.startTime
            ? total + durationMinutes(event.startTime, event.endTime)
            : total,
        0,
      )

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
        loadLevel: loadLevelFor(scheduledMinutes, events.length),
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
