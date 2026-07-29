import { ref } from 'vue'
import type { Priority } from '../../../entities/types'

type TaskComposerActions = {
  onSubmit: (title: string, priority: Priority) => void
  onCancel?: () => void
}

type TaskComposerOptions = {
  isSubtask: boolean
  isAllMode: boolean
}

export function useTaskComposerState(
  options: TaskComposerOptions,
  actions: TaskComposerActions,
) {
  const title = ref('')
  const priority = ref<Priority>(options.isSubtask ? 'minor' : 'major')

  function submit() {
    if (options.isAllMode) return

    const trimmedTitle = title.value.trim()
    if (!trimmedTitle) return

    actions.onSubmit(trimmedTitle, priority.value)
    title.value = ''
    priority.value = options.isSubtask ? 'minor' : 'major'
  }

  function cancel() {
    actions.onCancel?.()
  }

  return {
    title,
    priority,
    submit,
    cancel,
  }
}
