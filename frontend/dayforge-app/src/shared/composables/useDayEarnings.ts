import { computed } from 'vue'
import type { Goal } from '../../entities/GoalEntity'
import type { TaskTemplate } from '../../entities/TaskEntity'
import type { ID, ISODate } from '../../entities/types'
import { useSettings } from './useSettings'
import { useTimeEntries } from './useTimeEntries'
import { buildRateLookup } from './timer/rates'
import { earningsByDate, scopeHasRate } from './billing/dayEarnings'

/**
 * Earnings per day for the project header and the calendar. Money shows only
 * once a rate is set somewhere (a task, a project or the default), so someone
 * who never prices their time never sees a "$0".
 */
export function useDayEarnings(sources: {
  getTemplates: () => TaskTemplate[]
  getGoals: () => Goal[]
  /** One project, or `null` for all of them. */
  getGoalId?: () => ID | null
}) {
  const { settings } = useSettings()
  const { entries } = useTimeEntries()

  const lookup = computed(() =>
    buildRateLookup(
      sources.getTemplates(),
      sources.getGoals(),
      settings.timer.hourlyRate,
    ),
  )

  const goalId = computed(() => sources.getGoalId?.() ?? null)

  const showsMoney = computed(() => scopeHasRate(lookup.value, goalId.value))

  const byDate = computed(() =>
    earningsByDate(entries.value, lookup.value, goalId.value),
  )

  const money = computed(
    () =>
      new Intl.NumberFormat(settings.format.locale, {
        style: 'currency',
        currency: settings.timer.currency,
        // "$113" rather than "113 USD": it sits in tight spots.
        currencyDisplay: 'narrowSymbol',
        maximumFractionDigits: 0,
      }),
  )

  function earnedOn(date: ISODate): number {
    return byDate.value.get(date) ?? 0
  }

  function formatMoney(amount: number): string {
    return money.value.format(amount)
  }

  return { showsMoney, earnedOn, formatMoney }
}
