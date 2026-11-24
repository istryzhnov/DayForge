import { onMounted, watch } from 'vue'
import type { ISODate } from '../../../entities/types'
import {
  addDaysToISODate,
  getTodayISODate,
} from '../../../shared/composables/goalSpace/date'
import { pickStartHour } from './calendarStartHour'
import { pxPerMinute } from './useCalendarGrid'
import type { CalendarViewMode } from './useCalendarDayView'

const WEEK_LENGTH_DAYS = 7

type StartScrollOptions = {
  getMode: () => CalendarViewMode
  getCurrentDate: () => ISODate
  getWeekAnchor: () => ISODate
  /** The element whose top edge is midnight; null while no grid is drawn. */
  getGrid: () => HTMLElement | null
  /** The sticky toolbar on a phone, which the page scroll has to clear. */
  getHeader: () => HTMLElement | null
  getBlockStartMinutes: () => number[]
}

/** The nearest ancestor that scrolls on its own, or null when the page does. */
function scrollContainerOf(element: HTMLElement): HTMLElement | null {
  let node = element.parentElement
  while (node && node !== document.documentElement) {
    const { overflowY } = getComputedStyle(node)
    const scrolls = overflowY === 'auto' || overflowY === 'scroll'
    if (scrolls && node.scrollHeight > node.clientHeight + 1) return node
    node = node.parentElement
  }
  return null
}

/**
 * Opens the hour grid at its start hour on mount and whenever the day or week
 * on screen changes. Not on data changes, so it never pulls the grid back while
 * the user is looking at it. The jump is instant, so reduced motion needs nothing.
 */
export function useCalendarStartScroll(options: StartScrollOptions) {
  function rangeKey(): string {
    const mode = options.getMode()
    if (mode === 'week') return `week:${options.getWeekAnchor()}`
    return `${mode}:${options.getCurrentDate()}`
  }

  function rangeHasToday(): boolean {
    const today = getTodayISODate()
    const mode = options.getMode()
    if (mode === 'day') return options.getCurrentDate() === today
    if (mode === 'week') {
      const anchor = options.getWeekAnchor()
      return (
        anchor <= today && today < addDaysToISODate(anchor, WEEK_LENGTH_DAYS)
      )
    }
    return false
  }

  function scrollToStartHour() {
    const grid = options.getGrid()
    if (!grid) return

    const now = new Date()
    const hour = pickStartHour({
      blockStartMinutes: options.getBlockStartMinutes(),
      rangeHasToday: rangeHasToday(),
      nowMinutes: now.getHours() * 60 + now.getMinutes(),
    })
    const offsetPx = hour * 60 * pxPerMinute()

    // The desktop grid scrolls inside its card so the toolbar stays put.
    // Below 721px the grid is part of the page, which scrolls instead.
    const container = scrollContainerOf(grid)
    if (container) {
      container.scrollTop = offsetPx
      return
    }

    const gridTop = grid.getBoundingClientRect().top + window.scrollY
    const headerPx = options.getHeader()?.offsetHeight ?? 0
    window.scrollTo({ top: gridTop + offsetPx - headerPx })
  }

  watch(rangeKey, scrollToStartHour, { flush: 'post' })
  onMounted(scrollToStartHour)
}
