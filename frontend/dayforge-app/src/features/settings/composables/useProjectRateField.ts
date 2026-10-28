import { computed, ref, watch } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import { useSettings } from '../../../composables/useSettings'
import { i18n } from '../../../i18n'

type RateFieldProps = {
  goal: Goal
}

type RateFieldActions = {
  onUpdate: (hourlyRate: number | undefined) => void
}

export function useProjectRateField(
  props: RateFieldProps,
  actions: RateFieldActions,
) {
  const { settings } = useSettings()

  const ownRate = computed(() => props.goal.hourlyRate)
  const hasOwnRate = computed(() => (ownRate.value ?? 0) > 0)

  function storedDraft(): string {
    return hasOwnRate.value ? String(ownRate.value) : ''
  }

  const draft = ref(storedDraft())

  // The panel stays mounted while another project is selected.
  watch([() => props.goal.id, ownRate], () => {
    draft.value = storedDraft()
  })

  const currency = computed(() => settings.timer.currency)
  const defaultRate = computed(() => settings.timer.hourlyRate)

  const hint = computed(() => {
    if (defaultRate.value > 0) {
      return i18n.global.t('billing.rateHintDefault', {
        rate: defaultRate.value.toLocaleString(settings.format.locale),
        currency: currency.value,
      })
    }
    return i18n.global.t('billing.rateHintNone')
  })

  const placeholder = computed(() =>
    defaultRate.value > 0 ? String(defaultRate.value) : '0',
  )

  function commit() {
    const trimmed = String(draft.value ?? '').trim()
    if (trimmed === '') {
      actions.onUpdate(undefined)
      return
    }

    const value = Number(trimmed)
    if (!Number.isFinite(value) || value <= 0) {
      actions.onUpdate(undefined)
      draft.value = ''
      return
    }

    actions.onUpdate(value)
  }

  function clear() {
    draft.value = ''
    actions.onUpdate(undefined)
  }

  return {
    draft,
    currency,
    defaultRate,
    hasOwnRate,
    hint,
    placeholder,
    commit,
    clear,
  }
}
