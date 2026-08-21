import { computed, ref, watch } from 'vue'
import type { RecurrenceType } from '../../../entities/RecurrenceEntity'
import type { TaskSchedule } from '../../../entities/TaskEntity'
import type { ISODate, TimeOfDay } from '../../../entities/types'
import {
  DAY_WINDOW,
  DEFAULT_TASK_DURATION_MINUTES,
  RECURRENCE_HORIZON_DAYS,
  RECURRENCE_TYPE,
} from '../../../entities/constants'
import { addMinutesToTime, getTodayISODate } from '../../../composables/goalSpace/date'
import { recurrenceHorizonEnd } from '../../../composables/goalSpace/recurrence'

/** Repeat options offered in the composer (monthly/custom aren't exposed yet). */
export const REPEAT_OPTIONS = [
  { value: RECURRENCE_TYPE.NONE, label: 'Once' },
  { value: RECURRENCE_TYPE.DAILY, label: 'Every day' },
  { value: RECURRENCE_TYPE.CUSTOM, label: 'Every N days' },
  { value: RECURRENCE_TYPE.WEEKLY, label: 'On weekdays' },
] as const

/**
 * Displayed Monday-first to match the habit calendar, while the stored values
 * stay in `Date.getDay()` terms (0 = Sunday).
 */
export const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
] as const

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export const MIN_TIME: TimeOfDay = `${pad(DAY_WINDOW.START_HOUR)}:00`
export const MAX_TIME: TimeOfDay = `${pad(DAY_WINDOW.END_HOUR)}:00`

const DEFAULT_START_TIME: TimeOfDay = '09:00'

export function useTaskScheduleState() {
  const isEnabled = ref(false)
  const date = ref<ISODate>(getTodayISODate())
  const startTime = ref<TimeOfDay>(DEFAULT_START_TIME)
  const endTime = ref<TimeOfDay>(
    addMinutesToTime(DEFAULT_START_TIME, DEFAULT_TASK_DURATION_MINUTES),
  )
  const repeatType = ref<RecurrenceType>(RECURRENCE_TYPE.NONE)
  const intervalDays = ref(2)
  const weekdays = ref<number[]>([])

  const minDate = getTodayISODate()

  // Picking a start implies a default hour-long block; the user can still
  // override the end afterwards.
  watch(startTime, (next) => {
    if (!next) return
    endTime.value = addMinutesToTime(next, DEFAULT_TASK_DURATION_MINUTES)
  })

  const isWeekly = computed(() => repeatType.value === RECURRENCE_TYPE.WEEKLY)
  const isCustomInterval = computed(
    () => repeatType.value === RECURRENCE_TYPE.CUSTOM,
  )
  const repeatsUntil = computed(() =>
    repeatType.value === RECURRENCE_TYPE.NONE
      ? null
      : recurrenceHorizonEnd(date.value),
  )

  const error = computed<string | null>(() => {
    if (!isEnabled.value) return null
    if (!date.value) return 'Pick a date.'
    if (date.value < minDate) return 'Pick today or a later date.'
    if (!startTime.value || !endTime.value) return 'Pick a start and end time.'
    if (startTime.value < MIN_TIME || startTime.value > MAX_TIME) {
      return `Start must be between ${MIN_TIME} and ${MAX_TIME}.`
    }
    if (endTime.value <= startTime.value) return 'End must be after start.'
    if (endTime.value > MAX_TIME) return `End must be ${MAX_TIME} or earlier.`
    if (isCustomInterval.value && intervalDays.value < 1) {
      return 'Repeat every 1 day or more.'
    }
    if (isWeekly.value && !weekdays.value.length) {
      return 'Pick at least one weekday.'
    }
    return null
  })

  const isValid = computed(() => error.value === null)

  function toggleWeekday(day: number) {
    weekdays.value = weekdays.value.includes(day)
      ? weekdays.value.filter((item) => item !== day)
      : [...weekdays.value, day]
  }

  /** The payload for task creation, or undefined when scheduling is off. */
  function buildSchedule(): TaskSchedule | undefined {
    if (!isEnabled.value || !isValid.value) return undefined

    const startDate = date.value
    const endDate = recurrenceHorizonEnd(startDate)

    const recurrence =
      repeatType.value === RECURRENCE_TYPE.NONE
        ? { type: RECURRENCE_TYPE.NONE, startDate }
        : repeatType.value === RECURRENCE_TYPE.WEEKLY
          ? {
              type: RECURRENCE_TYPE.WEEKLY,
              daysOfWeek: [...weekdays.value],
              startDate,
              endDate,
            }
          : {
              // "Every day" and "every N days" are the same daily rule; only the
              // interval differs.
              type: RECURRENCE_TYPE.DAILY,
              interval: isCustomInterval.value
                ? Math.max(1, Math.round(intervalDays.value))
                : 1,
              startDate,
              endDate,
            }

    return {
      date: startDate,
      startTime: startTime.value,
      endTime: endTime.value,
      recurrence,
    }
  }

  function reset() {
    isEnabled.value = false
    date.value = getTodayISODate()
    startTime.value = DEFAULT_START_TIME
    endTime.value = addMinutesToTime(
      DEFAULT_START_TIME,
      DEFAULT_TASK_DURATION_MINUTES,
    )
    repeatType.value = RECURRENCE_TYPE.NONE
    intervalDays.value = 2
    weekdays.value = []
  }

  return {
    isEnabled,
    date,
    startTime,
    endTime,
    repeatType,
    intervalDays,
    weekdays,
    minDate,
    isWeekly,
    isCustomInterval,
    repeatsUntil,
    horizonDays: RECURRENCE_HORIZON_DAYS,
    error,
    isValid,
    toggleWeekday,
    buildSchedule,
    reset,
  }
}
