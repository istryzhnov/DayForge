import { computed } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { DailyTask, TaskTemplate } from '../../../entities/TaskEntity'
import type {
  AnalyticsPeriod,
  ProjectTotal,
} from '../../../composables/timer/analytics'
import { getTodayISODate } from '../../../composables/goalSpace/date'
import { useSettings } from '../../../composables/useSettings'
import { useTimeEntries } from '../../../composables/useTimeEntries'
import {
  earliestPlanDate,
  planBounds,
  planVsActual,
  plannedMsByProject,
} from './planVsActual'

/**
 * Plan against actual for the period on screen. The hero and the plan table
 * both read from here, so their numbers cannot drift apart.
 */
export function usePlanVsActual(source: {
  getPeriod: () => AnalyticsPeriod
  getGoals: () => Goal[]
  getTemplates: () => TaskTemplate[]
  getDailyTasks: () => DailyTask[]
  getActual: () => ProjectTotal[]
}) {
  const { settings } = useSettings()
  const { entries } = useTimeEntries()

  const bounds = computed(() =>
    planBounds(
      source.getPeriod(),
      getTodayISODate(),
      earliestPlanDate(
        entries.value,
        source.getDailyTasks(),
        source.getTemplates(),
      ),
    ),
  )

  const planned = computed(() =>
    plannedMsByProject(
      {
        templates: source.getTemplates(),
        dailyTasks: source.getDailyTasks(),
        defaultDurationMinutes: settings.calendar.defaultDurationMinutes,
      },
      bounds.value.from,
      bounds.value.to,
    ),
  )

  const result = computed(() =>
    planVsActual(planned.value, source.getActual(), source.getGoals()),
  )

  return { bounds, result }
}
