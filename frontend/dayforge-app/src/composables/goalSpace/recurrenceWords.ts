import { i18n } from '../../i18n'
import { dateNameLocale } from '../panelDateLabel'
import type { RecurrenceWords } from './recurrence'

/**
 * Rule labels in the interface language. Weekday names come from Intl in the
 * date locale, so they match the rest of the app's dates.
 */
export function recurrenceWords(): RecurrenceWords {
  const t = i18n.global.t
  return {
    once: t('tasks.repeatOnce'),
    daily: t('tasks.recurrenceDaily'),
    every: (days) => t('tasks.recurrenceEvery', days),
    weekly: t('tasks.recurrenceWeekly'),
    weeklyOn: (days) => t('tasks.recurrenceWeeklyOn', { days }),
    monthly: t('tasks.recurrenceMonthly'),
    monthlyOn: (days) => t('tasks.recurrenceMonthlyOn', { days }),
    yearly: t('tasks.everyYear'),
    repeats: t('tasks.recurrenceRepeats'),
    weekday: (day) =>
      // 2024-01-07 is a Sunday, so the index lands on the right weekday.
      new Date(2024, 0, 7 + day).toLocaleDateString(dateNameLocale(), {
        weekday: 'short',
      }),
  }
}
