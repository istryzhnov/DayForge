import { ref } from 'vue'
import type { ISODate } from '../../entities/types'
import { getTodayISODate } from './date'

/**
 * How often the app asks whether the calendar day has changed. A day ends only
 * once, and checking is a single date compare, so a minute is plenty.
 */
const CHECK_MS = 60_000

const today = ref<ISODate>(getTodayISODate())
let checking = false

function refreshToday() {
  const next = getTodayISODate()
  if (next !== today.value) today.value = next
}

/**
 * The real calendar day as a reactive value, so anything computed from "today"
 * re-evaluates once midnight passes. Background tabs run timers slowly, so
 * returning to the tab checks too.
 */
export function useToday() {
  if (!checking && typeof window !== 'undefined') {
    checking = true
    window.setInterval(refreshToday, CHECK_MS)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshToday()
    })
  }
  return today
}

/**
 * Which day a view should show after "today" changes. A view that was showing
 * the old today moves to the new one; a day the user picked on purpose stays.
 */
export function dayToShowAfterChange(
  shownDate: ISODate,
  previousToday: ISODate,
  nextToday: ISODate,
): ISODate {
  return shownDate === previousToday ? nextToday : shownDate
}
