import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Goal } from '../../../entities/GoalEntity'
import type { TaskTemplate } from '../../../entities/TaskEntity'
import { useSettings } from '../../../shared/composables/useSettings'
import { useTimer } from '../../../shared/composables/useTimer'
import { useTimeEntries } from '../../../shared/composables/useTimeEntries'
import { buildRateLookup } from '../../../shared/composables/timer/rates'
import {
  formatEarned,
  formatRate,
  liveStretchMs,
  sessionEarned,
  taskRate,
} from '../../timer'
import { capsuleMeta } from './liveTimerMeta'

/**
 * The live capsule's second line. It prices the sitting exactly as the Timer
 * view's subline does (same helpers, same formatters), so the two never disagree.
 */
export function useLiveTimerMeta(sources: {
  goals: MaybeRefOrGetter<Goal[]>
  templates: MaybeRefOrGetter<TaskTemplate[]>
}) {
  const { timer, now } = useTimer()
  const { entries } = useTimeEntries()
  const { settings } = useSettings()
  const { t } = useI18n()

  const lookup = computed(() =>
    buildRateLookup(
      toValue(sources.templates),
      toValue(sources.goals),
      settings.timer.hourlyRate,
    ),
  )

  const projectName = computed(() => {
    const goalId = timer.value.task?.goalId
    if (!goalId) return undefined
    return toValue(sources.goals).find((goal) => goal.id === goalId)?.title
  })

  const meta = computed(() => {
    const locale = settings.format.locale
    const currency = settings.timer.currency
    const rate = taskRate(lookup.value, timer.value.task)
    if (rate <= 0) return capsuleMeta({ projectName: projectName.value })

    const earned = sessionEarned({
      entries: entries.value,
      sessionId: timer.value.sessionId,
      liveMs: liveStretchMs(timer.value, now.value),
      task: timer.value.task,
      lookup: lookup.value,
    })
    return capsuleMeta({
      projectName: projectName.value,
      rateLabel: t('analytics.ratePerHour', {
        rate: formatRate(rate, locale, currency),
      }),
      earnedLabel: formatEarned(earned, locale, currency),
    })
  })

  return { meta }
}
