import { computed } from 'vue'
import type { ISODate } from '../../../entities/types'
import type {
  HabitDayState,
  HabitMonthView,
} from '../../../composables/analytics/habits'
import { useFormat } from '../../../composables/useFormat'

type HabitProps = {
  view: HabitMonthView
}

const STATE_LABEL: Record<HabitDayState, string> = {
  done: 'done',
  missed: 'missed',
  pending: 'not done yet',
  upcoming: 'upcoming',
  off: 'not due',
}

export function useHabitCalendar(props: HabitProps) {
  // Same locale setting as the rest of the panel's dates.
  const { formatDate } = useFormat()

  /** Start of the grid, the left-hand caption. */
  const rangeLabel = computed(() => {
    const first = props.view.dayTotals[0]
    if (!first) return ''
    return formatDate(first.date, { day: 'numeric', month: 'short' })
  })

  /** "done / due · %" for the whole grid. */
  const summary = computed(() => {
    const { completed, expected, completionRate } = props.view
    return `${completed} / ${expected} · ${Math.round((completionRate ?? 0) * 100)}%`
  })

  function cellLabel(date: ISODate, state: HabitDayState): string {
    const text = formatDate(date, { day: 'numeric', month: 'short' })
    return `${text}: ${STATE_LABEL[state]}`
  }

  return { rangeLabel, summary, cellLabel }
}
