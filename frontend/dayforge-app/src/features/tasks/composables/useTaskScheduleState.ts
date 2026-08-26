import { computed, ref, watch } from 'vue'
import type { RecurrenceType } from '../../../entities/RecurrenceEntity'
import type { TaskSchedule } from '../../../entities/TaskEntity'
import type { ISODate, TimeOfDay } from '../../../entities/types'
import { DAY_WINDOW, RECURRENCE_TYPE } from '../../../entities/constants'
import { useSettings } from '../../../composables/useSettings'
import {
  addMinutesToTime,
  getTodayISODate,
} from '../../../composables/goalSpace/date'

/** Repeat options offered in the composer (monthly/custom aren't exposed yet). */
export const REPEAT_OPTIONS = [
  { value: RECURRENCE_TYPE.NONE, label: 'Once' },
  { value: RECURRENCE_TYPE.DAILY, label: 'Every day' },
  { value: RECURRENCE_TYPE.CUSTOM, label: 'Every N days' },
  { value: RECURRENCE_TYPE.WEEKLY, label: 'On weekdays' },
  { value: RECURRENCE_TYPE.YEARLY, label: 'Every year' },
] as const

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

export function useTaskScheduleState() {
  const { settings } = useSettings()

  const defaultStart = () => settings.calendar.defaultStartTime
  const defaultEnd = () =>
    addMinutesToTime(defaultStart(), settings.calendar.defaultDurationMinutes)

  const isEnabled = ref(false)
  const date = ref<ISODate>(getTodayISODate())
  const startTime = ref<TimeOfDay>(defaultStart())
  const endTime = ref<TimeOfDay>(defaultEnd())
  const repeatType = ref<RecurrenceType>(RECURRENCE_TYPE.NONE)
  const intervalDays = ref(2)
  const weekdays = ref<number[]>([])

  const minDate = getTodayISODate()

  watch(startTime, (next) => {
    if (!next) return
    endTime.value = addMinutesToTime(
      next,
      settings.calendar.defaultDurationMinutes,
    )
  })

  const isWeekly = computed(() => repeatType.value === RECURRENCE_TYPE.WEEKLY)
  const isCustomInterval = computed(
    () => repeatType.value === RECURRENCE_TYPE.CUSTOM,
  )
  const isRepeating = computed(() => repeatType.value !== RECURRENCE_TYPE.NONE)
  const isAnnual = computed(() => repeatType.value === RECURRENCE_TYPE.YEARLY)

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

    const recurrence =
      repeatType.value === RECURRENCE_TYPE.NONE
        ? { type: RECURRENCE_TYPE.NONE, startDate }
        : repeatType.value === RECURRENCE_TYPE.YEARLY
          ? { type: RECURRENCE_TYPE.YEARLY, startDate }
          : repeatType.value === RECURRENCE_TYPE.WEEKLY
            ? {
                type: RECURRENCE_TYPE.WEEKLY,
                daysOfWeek: [...weekdays.value],
                startDate,
              }
            : {
                type: RECURRENCE_TYPE.DAILY,
                interval: isCustomInterval.value
                  ? Math.max(1, Math.round(intervalDays.value))
                  : 1,
                startDate,
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
    startTime.value = defaultStart()
    endTime.value = defaultEnd()
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
    isRepeating,
    isAnnual,
    error,
    isValid,
    toggleWeekday,
    buildSchedule,
    reset,
  }
}
