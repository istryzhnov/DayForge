import { ref } from 'vue'

type NewGoalFormActions = {
  onSubmit: (title: string, description: string) => void
  onCancel: () => void
}

export function useNewGoalFormState(actions: NewGoalFormActions) {
  const title = ref('')
  const description = ref('')

  function submit() {
    const trimmedTitle = title.value.trim()
    if (!trimmedTitle) return

    actions.onSubmit(trimmedTitle, description.value.trim())
    title.value = ''
    description.value = ''
  }

  function cancel() {
    actions.onCancel()
  }

  return {
    title,
    description,
    submit,
    cancel,
  }
}
