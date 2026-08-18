import { ref } from 'vue'
import type { Priority } from '../../../entities/types'
import type { TaskSchedule } from '../../../entities/TaskEntity'
import { PRIORITY } from '../../../entities/constants'

type TaskComposerActions = {
  onSubmit: (
    title: string,
    priority: Priority,
    schedule?: TaskSchedule,
  ) => void
  onCancel?: () => void
}

type TaskComposerOptions = {
  isSubtask: boolean
  isAllMode: boolean
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
  const priority = ref<Priority>(
    options.isSubtask ? PRIORITY.MINOR : PRIORITY.MAJOR,
  )

  function submit() {
    if (options.isAllMode) return

    const trimmedTitle = title.value.trim()
    if (!trimmedTitle) return
    if (options.canSubmitSchedule && !options.canSubmitSchedule()) return

    actions.onSubmit(trimmedTitle, priority.value, options.readSchedule?.())
    title.value = ''
    priority.value = options.isSubtask ? PRIORITY.MINOR : PRIORITY.MAJOR
    options.onScheduleSubmitted?.()
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
