import { computed, onScopeDispose, ref } from 'vue'
import type { ISODate } from '../../../entities/types'
import { getTodayISODate } from '../../../composables/goalSpace/date'
import { pxPerMinute } from './useCalendarGrid'

const TICK_MS = 60_000

export function useCalendarNow(getDate: () => ISODate) {
  const now = ref(new Date())
  const timer = setInterval(() => {
    now.value = new Date()
  }, TICK_MS)
  onScopeDispose(() => clearInterval(timer))

  const isToday = computed(() => {
    now.value
    return getDate() === getTodayISODate()
  })

  const nowTopPx = computed(
    () => (now.value.getHours() * 60 + now.value.getMinutes()) * pxPerMinute(),
  )

  return { isToday, nowTopPx }
}
