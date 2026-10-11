import { computed, ref } from 'vue'
import { totalsByTask, type TaskTotal } from '../../../composables/timer/entries'
import { useTimeEntries } from '../../../composables/useTimeEntries'
import { formatShortDuration } from '../../../composables/timer/format'

export const TOTALS_RANGE = {
  TODAY: 'today',
  WEEK: 'week',
  ALL: 'all',
} as const

export type TotalsRange = (typeof TOTALS_RANGE)[keyof typeof TOTALS_RANGE]

export const TOTALS_RANGE_OPTIONS: { id: TotalsRange; label: string }[] = [
  { id: TOTALS_RANGE.TODAY, label: 'Today' },
  { id: TOTALS_RANGE.WEEK, label: 'Last 7 days' },
  { id: TOTALS_RANGE.ALL, label: 'All time' },
]

const DAY_MS = 24 * 60 * 60 * 1000

function startOfToday(): number {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function useTimeTotals() {
  const { entries } = useTimeEntries()
  const range = ref<TotalsRange>(TOTALS_RANGE.TODAY)

  const since = computed(() => {
    if (range.value === TOTALS_RANGE.ALL) return undefined
    if (range.value === TOTALS_RANGE.WEEK) return startOfToday() - 6 * DAY_MS
    return startOfToday()
  })

  const totals = computed(() => totalsByTask(entries.value, since.value))

  const grandTotalMs = computed(() =>
    totals.value.reduce((sum, total) => sum + total.totalMs, 0),
  )

  /** The longest task sets the bar's full width. */
  const longestMs = computed(() =>
    totals.value.reduce((max, total) => Math.max(max, total.totalMs), 0),
  )

  function barWidth(total: TaskTotal): string {
    if (longestMs.value === 0) return '0%'
    return `${Math.max(2, (total.totalMs / longestMs.value) * 100)}%`
  }

  function shareLabel(total: TaskTotal): string {
    if (grandTotalMs.value === 0) return ''
    return `${Math.round((total.totalMs / grandTotalMs.value) * 100)}%`
  }

  function durationLabel(total: TaskTotal): string {
    return formatShortDuration(total.totalMs)
  }

  function sessionLabel(total: TaskTotal): string {
    return total.sessionCount === 1
      ? '1 session'
      : `${total.sessionCount} sessions`
  }

  return {
    range,
    totals,
    grandTotalLabel: computed(() => formatShortDuration(grandTotalMs.value)),
    barWidth,
    shareLabel,
    durationLabel,
    sessionLabel,
  }
}
