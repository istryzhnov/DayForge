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
import { pxPerMinute, minutesFromDayStart } from './useCalendarGrid'
import { layoutOverlaps, type OverlapSlot } from './overlapLayout'
import { useSettings } from '../../../composables/useSettings'
import { useFormat } from '../../../composables/useFormat'

const DAYS_PER_WEEK = 7

export type PositionedEvent = DayEvent & {
  topPx: number
  heightPx: number
  /** Absent when nothing else shares these hours. */
  slot?: OverlapSlot
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

export function startOfWeek(date: ISODate, weekStartsOn: 0 | 1 = 1): ISODate {
  const offset = (weekdayOfISODate(date) - weekStartsOn + 7) % 7
  return addDaysToISODate(date, -offset)
}

export function useCalendarWeek(options: WeekOptions) {
  const { settings } = useSettings()
  const { locale } = useFormat()

  // Follows `currentDate` until the user pages to another week.
  const weekAnchor = ref<ISODate | null>(null)

  const anchor = computed(
    () =>
      weekAnchor.value ??
      startOfWeek(options.getCurrentDate(), settings.calendar.weekStartsOn),
  )

  const days = computed<WeekDayColumn[]>(() => {
    const templates = options.getTemplates()
    const rowsByDate = groupRowsByDate(options.getDailyTasks())
    const today = getTodayISODate()

    return Array.from({ length: DAYS_PER_WEEK }, (_, index) => {
      const date = addDaysToISODate(anchor.value, index)
      const events = collectDayEvents({ templates, rowsByDate, date })

      const timed = events
        .filter((event) => event.startTime)
        .map((event) => {
          const startMin = minutesFromDayStart(event.startTime!)
          return {
            event,
            startMin,
            endMin: event.endTime
              ? minutesFromDayStart(event.endTime)
              : startMin + 60,
          }
        })

      const slots = layoutOverlaps(
        timed.map((item) => ({
          id: item.event.key,
          startMin: item.startMin,
          endMin: item.endMin,
        })),
      )

      const scheduled = timed.map(({ event, startMin, endMin }) => ({
        ...event,
        topPx: startMin * pxPerMinute(),
        heightPx: Math.max((endMin - startMin) * pxPerMinute(), 18),
        slot: slots.get(event.key),
      }))

      return {
        date,
        weekdayLabel: parseISODate(date).toLocaleDateString(locale.value, {
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

    const startText = start.toLocaleDateString(locale.value, {
      day: 'numeric',
      ...(sameMonth ? {} : { month: 'short' }),
    })
    const endText = end.toLocaleDateString(locale.value, {
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
    weekAnchor.value = startOfWeek(
      getTodayISODate(),
      settings.calendar.weekStartsOn,
    )
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
