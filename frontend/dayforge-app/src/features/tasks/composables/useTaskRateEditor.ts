import { computed, ref } from 'vue'
import type { TaskNode } from '../../../composables/useTaskTree'
import { useSettings } from '../../../composables/useSettings'
import { rateFromChain } from '../../../composables/timer/rates'

type RateEditorProps = {
  node: TaskNode
}

type RateEditorActions = {
  onSave: (hourlyRate: number | undefined) => void
}

export function useTaskRateEditor(
  props: RateEditorProps,
  actions: RateEditorActions,
) {
  const { settings } = useSettings()

  const ownRate = computed(() => props.node.template?.hourlyRate)
  const hasOwnRate = computed(() => (ownRate.value ?? 0) > 0)

  const draft = ref(hasOwnRate.value ? String(ownRate.value) : '')

  const currency = computed(() => settings.timer.currency)
  const projectRate = computed(() =>
    (props.node.goalRate ?? 0) > 0 ? props.node.goalRate : undefined,
  )

  /** What this task would bill at with no rate of its own. */
  const inheritedRate = computed(() =>
    rateFromChain(undefined, projectRate.value, settings.timer.hourlyRate),
  )

  const parsed = computed(() => {
    const trimmed = String(draft.value ?? '').trim()
    if (trimmed === '') return undefined
    const value = Number(trimmed)
    return Number.isFinite(value) && value > 0 ? value : undefined
  })

  const isEmpty = computed(() => String(draft.value ?? '').trim() === '')
  const isValid = computed(() => isEmpty.value || parsed.value !== undefined)

  const inheritedFrom = computed(() => {
    if (projectRate.value !== undefined) return 'the project'
    return 'Settings → Timer'
  })

  const hint = computed(() => {
    if (inheritedRate.value > 0) {
      return `Leave it empty to bill at ${inheritedRate.value} ${currency.value} an hour, inherited from ${inheritedFrom.value}.`
    }
    return 'Leave it empty and this task bills at nothing until a project or default rate is set.'
  })

  const placeholder = computed(() =>
    inheritedRate.value > 0 ? String(inheritedRate.value) : '0',
  )

  function save() {
    if (!isValid.value) return
    actions.onSave(isEmpty.value ? undefined : parsed.value)
  }

  function clear() {
    draft.value = ''
    actions.onSave(undefined)
  }

  return {
    draft,
    currency,
    hasOwnRate,
    isValid,
    hint,
    placeholder,
    save,
    clear,
  }
}
