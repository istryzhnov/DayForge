import { ref } from 'vue'
import type { Priority } from '../../../entities/types'
import { PRIORITY } from '../../../entities/constants'

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
  const priority = ref<Priority>(
    options.isSubtask ? PRIORITY.MINOR : PRIORITY.MAJOR,
  )

  function submit() {
    if (options.isAllMode) return

    const trimmedTitle = title.value.trim()
    if (!trimmedTitle) return

    actions.onSubmit(trimmedTitle, priority.value)
    title.value = ''
    priority.value = options.isSubtask ? PRIORITY.MINOR : PRIORITY.MAJOR
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
