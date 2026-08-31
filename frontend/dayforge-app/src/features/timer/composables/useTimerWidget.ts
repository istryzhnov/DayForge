import { computed } from 'vue'
import { useTimeEntries } from '../../../composables/useTimeEntries'
import { formatShortDuration } from '../../../composables/timer/format'
import { useTimerControls } from './useTimerControls'

export function useTimerWidget() {
  const controls = useTimerControls()
  const { todayTotalMs } = useTimeEntries()

  return {
    ...controls,
    taskLabel: computed(
      () => controls.task.value?.taskTitle ?? 'No task attached',
    ),
    todayLabel: computed(() => formatShortDuration(todayTotalMs.value)),
  }
}
