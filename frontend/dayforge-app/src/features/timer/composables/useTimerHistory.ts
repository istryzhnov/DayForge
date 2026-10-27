import { computed } from 'vue'
import type { TimeEntry } from '../../../entities/TimerEntity'
import { TIMER_MODE, TIME_ENTRY_SOURCE } from '../../../entities/constants'
import { useTimeEntries } from '../../../composables/useTimeEntries'
import { useSettings, CLOCK_FORMAT } from '../../../composables/useSettings'
import { parseISODate } from '../../../composables/goalSpace/date'
import {
  entryDurationMs,
  type DayGroup,
} from '../../../composables/timer/entries'
import {
  formatDayHeading,
  formatEntryDuration,
  formatHoursMinutes,
  formatTimeLabel,
} from '../../../composables/timer/format'
import { PHASE_LABELS } from '../../../composables/timer/pomodoro'

export function useTimerHistory() {
  const { days, removeEntry } = useTimeEntries()
  const { settings } = useSettings()

  const uses12Hour = computed(() => settings.format.clock === CLOCK_FORMAT.H12)

  function timeRange(entry: TimeEntry): string {
    const from = formatTimeLabel(
      entry.startedAt,
      settings.format.locale,
      uses12Hour.value,
    )
    const to = formatTimeLabel(
      entry.endedAt,
      settings.format.locale,
      uses12Hour.value,
    )
    return `${from} – ${to}`
  }

  function durationLabel(entry: TimeEntry): string {
    return formatEntryDuration(entryDurationMs(entry))
  }

  function kindLabel(entry: TimeEntry): string {
    if (entry.source === TIME_ENTRY_SOURCE.MANUAL) return 'Added by hand'
    if (entry.mode === TIMER_MODE.POMODORO && entry.phase) {
      return PHASE_LABELS[entry.phase]
    }
    return entry.mode === TIMER_MODE.COUNTDOWN ? 'Countdown' : 'Stopwatch'
  }

  function dayLabel(group: DayGroup): string {
    return formatDayHeading(parseISODate(group.date))
  }

  function dayTotalLabel(group: DayGroup): string {
    return formatHoursMinutes(group.totalMs)
  }

  return {
    days,
    removeEntry,
    timeRange,
    durationLabel,
    kindLabel,
    dayLabel,
    dayTotalLabel,
  }
}
