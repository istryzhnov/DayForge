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
import {
  durationWords,
  modeLabel,
  phaseLabel,
} from '../../../composables/timer/text'
import { i18n } from '../../../i18n'

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
    return formatEntryDuration(entryDurationMs(entry), durationWords())
  }

  function kindLabel(entry: TimeEntry): string {
    if (entry.source === TIME_ENTRY_SOURCE.MANUAL) {
      return i18n.global.t('timer.kindManual')
    }
    if (entry.mode === TIMER_MODE.POMODORO && entry.phase) {
      return phaseLabel(entry.phase)
    }
    return modeLabel(
      entry.mode === TIMER_MODE.COUNTDOWN
        ? TIMER_MODE.COUNTDOWN
        : TIMER_MODE.STOPWATCH,
    )
  }

  function dayLabel(group: DayGroup): string {
    return formatDayHeading(parseISODate(group.date))
  }

  function dayTotalLabel(group: DayGroup): string {
    return formatHoursMinutes(group.totalMs, durationWords())
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
