import { computed } from 'vue'
import type { ID } from '../../../entities/types'
import { useTimer } from '../../../composables/useTimer'
import { useTimeEntries } from '../../../composables/useTimeEntries'
import { formatShortDuration } from '../../../composables/timer/format'
import { durationWords } from '../../../composables/timer/text'
import { i18n } from '../../../i18n'

type TaskTimerProps = {
  taskId: ID
  title: string
  goalId?: ID
  /** Tasks whose time counts towards this one, for a project's own tally. */
  rollupTaskIds?: ID[]
}

type TaskTimerRef = {
  taskId: ID
  taskTitle: string
  goalId?: ID
}

/** Starts or stops the timer on one task; the same action the row button uses. */
export function toggleTaskTimer(task: TaskTimerRef) {
  useTimer().toggleForTask({
    taskId: task.taskId,
    goalId: task.goalId,
    taskTitle: task.taskTitle,
  })
}

export function useTaskTimerButton(props: TaskTimerProps) {
  const timer = useTimer()
  const { totalForTasks } = useTimeEntries()

  const isActive = computed(() => timer.isActiveTask(props.taskId))
  const totalMs = computed(() =>
    totalForTasks([props.taskId, ...(props.rollupTaskIds ?? [])]),
  )

  /** Hidden until the task has recorded time or is being timed right now. */
  const isShown = computed(() => isActive.value || totalMs.value > 0)

  function toggle() {
    toggleTaskTimer({
      taskId: props.taskId,
      taskTitle: props.title,
      goalId: props.goalId,
    })
  }

  return {
    isActive,
    isShown,
    totalMs,
    totalLabel: computed(() =>
      totalMs.value > 0
        ? formatShortDuration(totalMs.value, durationWords())
        : '',
    ),
    runningLabel: timer.displayLabel,
    hint: computed(() =>
      i18n.global.t(isActive.value ? 'timer.stopOnTask' : 'timer.startOnTask'),
    ),
    toggle,
  }
}
