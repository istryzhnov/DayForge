import { ref } from 'vue'
import type { TaskSchedule } from '../../../entities/TaskEntity'

type TaskComposerActions = {
  onSubmit: (title: string, schedule?: TaskSchedule) => void
  onCancel?: () => void
}

type TaskComposerOptions = {
  isSubtask: boolean
  /** Supplies the optional schedule payload; absent when the composer has no schedule UI. */
  readSchedule?: () => TaskSchedule | undefined
  /** Blocks submission while the schedule block is filled in incorrectly. */
  canSubmitSchedule?: () => boolean
  onScheduleSubmitted?: () => void
}

export function useTaskComposerState(
  options: TaskComposerOptions,
  actions: TaskComposerActions,
) {
  const title = ref('')

  function submit() {
    const trimmedTitle = title.value.trim()
    if (!trimmedTitle) return
    if (options.canSubmitSchedule && !options.canSubmitSchedule()) return

    actions.onSubmit(trimmedTitle, options.readSchedule?.())
    title.value = ''
    options.onScheduleSubmitted?.()
  }

  function cancel() {
    actions.onCancel?.()
  }

  return {
    title,
    submit,
    cancel,
  }
}
