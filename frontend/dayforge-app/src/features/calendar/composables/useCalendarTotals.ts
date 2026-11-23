import { computed } from 'vue'
import type { ISODate } from '../../../entities/types'
import { useTimer } from '../../../shared/composables/useTimer'
import { useTimeEntries } from '../../../shared/composables/useTimeEntries'
import { totalsByDay } from '../../../shared/composables/timer/entries'
import { toLocalISODate } from '../../../shared/composables/goalSpace/date'
import { sumOverDates } from './calendarTotals'

/**
 * Tracked time for calendar periods. The running stretch counts toward today,
 * and `liveTaskId` names the task the timer is on, so its block can glow.
 */
export function useCalendarTotals() {
  const { entries } = useTimeEntries()
  const { timer, now, isRunning, task } = useTimer()

  const totals = computed(() => {
    const byDate = totalsByDay(entries.value)
    const started = timer.value.startedAt
    if (isRunning.value && started !== null) {
      const today = toLocalISODate(new Date(now.value))
      const stretch = Math.max(0, now.value - started)
      byDate.set(today, (byDate.get(today) ?? 0) + stretch)
    }
    return byDate
  })

  const liveTaskId = computed(() =>
    isRunning.value ? (task.value?.taskId ?? null) : null,
  )

  function trackedMsOn(dates: readonly ISODate[]): number {
    return sumOverDates(totals.value, dates)
  }

  return { trackedMsOn, liveTaskId }
}
