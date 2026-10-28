import { computed } from 'vue'
import { i18n } from '../../../i18n'
import type { ISODate } from '../../../entities/types'
import type {
  HabitDayState,
  HabitMonthView,
} from '../../../composables/analytics/habits'
import { panelDateLabel } from '../../../composables/panelDateLabel'

type HabitProps = {
  view: HabitMonthView
}

const STATE_LABEL_KEY: Record<HabitDayState, string> = {
  done: 'goals.stateDone',
  missed: 'goals.stateMissed',
  pending: 'goals.statePending',
  upcoming: 'goals.stateUpcoming',
  off: 'goals.stateOff',
}

export function useHabitCalendar(props: HabitProps) {
  /** Start of the grid, the left-hand caption. */
  const rangeLabel = computed(() => {
    const first = props.view.dayTotals[0]
    if (!first) return ''
    return panelDateLabel(first.date, { day: 'numeric', month: 'short' })
  })

  /** "done / due · %" for the whole grid. */
  const summary = computed(() => {
    const { completed, expected, completionRate } = props.view
    return `${completed} / ${expected} · ${Math.round((completionRate ?? 0) * 100)}%`
  })

  function cellLabel(date: ISODate, state: HabitDayState): string {
    const text = panelDateLabel(date, { day: 'numeric', month: 'short' })
    return i18n.global.t('goals.habitCell', {
      date: text,
      state: i18n.global.t(STATE_LABEL_KEY[state]),
    })
  }

  return { rangeLabel, summary, cellLabel }
}
