import { ref } from 'vue'
import type { Priority } from '../../../entities/types'
import type { TaskSchedule } from '../../../entities/TaskEntity'
import { useSettings } from '../../../composables/useSettings'

type TaskComposerActions = {
  onSubmit: (title: string, priority: Priority, schedule?: TaskSchedule) => void
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
  // Everything starts as a plain task; projects only come from promotion.
  const priority = ref<Priority>(
    useSettings().settings.behavior.defaultPriority,
  )

  function submit() {
    if (options.isAllMode) return

    const trimmedTitle = title.value.trim()
    if (!trimmedTitle) return
    if (options.canSubmitSchedule && !options.canSubmitSchedule()) return

    actions.onSubmit(trimmedTitle, priority.value, options.readSchedule?.())
    title.value = ''
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
