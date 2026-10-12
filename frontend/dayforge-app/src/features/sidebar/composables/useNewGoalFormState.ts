import { ref } from 'vue'
import { GOAL_COLOR_PRESETS } from '../../../entities/constants'

type NewGoalFormActions = {
  onSubmit: (title: string, description: string, color: string) => void
  onCancel: () => void
}

export function useNewGoalFormState(actions: NewGoalFormActions) {
  const title = ref('')
  const description = ref('')
  const color = ref<string>(GOAL_COLOR_PRESETS[0])

  function submit() {
    const trimmedTitle = title.value.trim()
    if (!trimmedTitle) return

    actions.onSubmit(trimmedTitle, description.value.trim(), color.value)
    title.value = ''
    description.value = ''
    color.value = GOAL_COLOR_PRESETS[0]
  }

  function cancel() {
    actions.onCancel()
  }

  return {
    title,
    description,
    color,
    submit,
    cancel,
  }
}
