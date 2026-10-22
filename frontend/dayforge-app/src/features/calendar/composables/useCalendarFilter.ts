import { computed } from 'vue'
import type { ID } from '../../../entities/types'
import {
  NO_PROJECT_FILTER_ID,
  useSettings,
} from '../../../composables/useSettings'

/** One predicate shared by the day, week and month views. */
export function useCalendarFilter() {
  const { settings, update } = useSettings()

  const hiddenIds = computed(() => new Set(settings.calendar.hiddenGoalIds))

  const isFilterActive = computed(() => hiddenIds.value.size > 0)

  function isGoalVisible(goalId?: ID): boolean {
    return !hiddenIds.value.has(goalId ?? NO_PROJECT_FILTER_ID)
  }

  function toggleGoal(id: ID) {
    const current = settings.calendar.hiddenGoalIds
    const next = hiddenIds.value.has(id)
      ? current.filter((hiddenId) => hiddenId !== id)
      : [...current, id]
    update('calendar', { hiddenGoalIds: next })
  }

  function showAll() {
    update('calendar', { hiddenGoalIds: [] })
  }

  /** Hides every listed project and the tasks without one. */
  function hideAll(goalIds: ID[]) {
    update('calendar', {
      hiddenGoalIds: [...new Set([...goalIds, NO_PROJECT_FILTER_ID])],
    })
  }

  return { isGoalVisible, toggleGoal, showAll, hideAll, isFilterActive }
}
