import { computed, ref } from 'vue'
import type { DailyTask, TaskTemplate } from '../../../entities/TaskEntity'
import type { ISODate } from '../../../entities/types'
import {
  addDaysToISODate,
  getTodayISODate,
  parseISODate,
  weekdayOfISODate,
} from '../../../composables/goalSpace/date'
import {
  collectDayEvents,
  groupRowsByDate,
  scheduledMinutesOf,
  type DayEvent,
} from './useCalendarOccurrences'
import { PX_PER_MINUTE, minutesFromDayStart } from './useCalendarGrid'

const DAYS_PER_WEEK = 7

export type PositionedEvent = DayEvent & {
  topPx: number
  heightPx: number
}

export type WeekDayColumn = {
  date: ISODate
  weekdayLabel: string
  dayNumber: number
  isToday: boolean
  /** Placed on the grid — only events that actually have a time. */
  scheduled: PositionedEvent[]
  /** Everything else, surfaced as a count rather than cluttering the grid. */
  unscheduledCount: number
  doneCount: number
  totalCount: number
  scheduledMinutes: number
}

type WeekOptions = {
  getTemplates: () => TaskTemplate[]
  getDailyTasks: () => DailyTask[]
  getCurrentDate: () => ISODate
}

/** Monday on or before the given date (getDay: 0 = Sunday). */
export function startOfWeek(date: ISODate): ISODate {
  const mondayOffset = (weekdayOfISODate(date) + 6) % 7
  return addDaysToISODate(date, -mondayOffset)
}

export function useCalendarWeek(options: WeekOptions) {
  // Follows `currentDate` until the user pages to another week.
  const weekAnchor = ref<ISODate | null>(null)

  const anchor = computed(
    () => weekAnchor.value ?? startOfWeek(options.getCurrentDate()),
  )

  const days = computed<WeekDayColumn[]>(() => {
    const templates = options.getTemplates()
    const rowsByDate = groupRowsByDate(options.getDailyTasks())
    const today = getTodayISODate()

    return Array.from({ length: DAYS_PER_WEEK }, (_, index) => {
      const date = addDaysToISODate(anchor.value, index)
      const events = collectDayEvents({ templates, rowsByDate, date })

      const scheduled = events
        .filter((event) => event.startTime)
        .map((event) => {
          const startMin = minutesFromDayStart(event.startTime!)
          const endMin = event.endTime
            ? minutesFromDayStart(event.endTime)
            : startMin + 60
          return {
            ...event,
            topPx: startMin * PX_PER_MINUTE,
            heightPx: Math.max((endMin - startMin) * PX_PER_MINUTE, 18),
          }
        })

      return {
        date,
        weekdayLabel: parseISODate(date).toLocaleDateString('en-GB', {
          weekday: 'short',
        }),
        dayNumber: Number(date.split('-')[2]),
        isToday: date === today,
        scheduled,
        unscheduledCount: events.length - scheduled.length,
        doneCount: events.filter((event) => event.isDone).length,
        totalCount: events.length,
        scheduledMinutes: scheduledMinutesOf(events),
      }
    })
  })

  const weekLabel = computed(() => {
    const start = parseISODate(anchor.value)
    const end = parseISODate(addDaysToISODate(anchor.value, 6))
    const sameMonth = start.getMonth() === end.getMonth()

    const startText = start.toLocaleDateString('en-GB', {
      day: 'numeric',
      ...(sameMonth ? {} : { month: 'short' }),
    })
    const endText = end.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

    return `${startText} – ${endText}`
  })

  const weekSummary = computed(() => {
    const total = days.value.reduce((sum, day) => sum + day.totalCount, 0)
    const done = days.value.reduce((sum, day) => sum + day.doneCount, 0)
    const hours = Math.round(
      days.value.reduce((sum, day) => sum + day.scheduledMinutes, 0) / 60,
    )
    return { total, done, hours }
  })

  function goToPreviousWeek() {
    weekAnchor.value = addDaysToISODate(anchor.value, -DAYS_PER_WEEK)
  }

  function goToNextWeek() {
    weekAnchor.value = addDaysToISODate(anchor.value, DAYS_PER_WEEK)
  }

  /** Jump to the week containing the real today, not the selected day's week. */
  function goToThisWeek() {
    weekAnchor.value = startOfWeek(getTodayISODate())
  }

  return {
    anchor,
    days,
    weekLabel,
    weekSummary,
    goToPreviousWeek,
    goToNextWeek,
    goToThisWeek,
  }
}
