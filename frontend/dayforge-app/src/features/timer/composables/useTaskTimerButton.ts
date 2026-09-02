import { computed } from 'vue'
import type { ID } from '../../../entities/types'
import { useTimer } from '../../../composables/useTimer'
import { useTimeEntries } from '../../../composables/useTimeEntries'
import { formatShortDuration } from '../../../composables/timer/format'

type TaskTimerProps = {
  taskId: ID
  title: string
  goalId?: ID
  /** Tasks whose time counts towards this one, for a project's own tally. */
  rollupTaskIds?: ID[]
}

export function useTaskTimerButton(props: TaskTimerProps) {
  const timer = useTimer()
  const { totalForTasks } = useTimeEntries()

  const isActive = computed(() => timer.isActiveTask(props.taskId))
  const totalMs = computed(() =>
    totalForTasks([props.taskId, ...(props.rollupTaskIds ?? [])]),
  )

  function toggle() {
    timer.toggleForTask({
      taskId: props.taskId,
      goalId: props.goalId,
      taskTitle: props.title,
    })
  }

  return {
    isActive,
    totalMs,
    totalLabel: computed(() =>
      totalMs.value > 0 ? formatShortDuration(totalMs.value) : '',
    ),
    runningLabel: timer.displayLabel,
    hint: computed(() =>
      isActive.value
        ? 'Stop the timer on this task'
        : 'Start a timer on this task',
    ),
    toggle,
  }
}
