import { computed, ref } from 'vue'
import type { TimerMode } from '../../../entities/TimerEntity'
import { TIMER_MODE } from '../../../entities/constants'
import { useSettings } from '../../../composables/useSettings'
import { useTimeEntries } from '../../../composables/useTimeEntries'
import { formatShortDuration } from '../../../composables/timer/format'
import { focusesUntilLongBreak } from '../../../composables/timer/pomodoro'
import { useTimerControls } from './useTimerControls'

export const COUNTDOWN_PRESETS = [5, 10, 15, 25, 45, 60]

export const MODE_OPTIONS: { id: TimerMode; label: string }[] = [
  { id: TIMER_MODE.STOPWATCH, label: 'Stopwatch' },
  { id: TIMER_MODE.COUNTDOWN, label: 'Countdown' },
  { id: TIMER_MODE.POMODORO, label: 'Pomodoro' },
]

export function useTimerView() {
  const controls = useTimerControls()
  const { settings } = useSettings()
  const { todayTotalMs } = useTimeEntries()

  const countdownMinutes = ref(settings.timer.defaultCountdownMinutes)

  const mode = computed(() => controls.timer.value.mode)

  function selectMode(next: TimerMode) {
    if (next === mode.value) return
    controls.setMode(next)
  }

  /** An idle countdown starts on the length picked here, not the stored one. */
  function primary() {
    if (controls.isIdle.value && mode.value === TIMER_MODE.COUNTDOWN) {
      controls.startCountdown(countdownMinutes.value)
      return
    }
    controls.primary()
  }

  const hint = computed(() => {
    const state = controls.timer.value
    if (state.mode !== TIMER_MODE.POMODORO) return ''

    const left = focusesUntilLongBreak(
      state.completedFocusCount,
      settings.timer,
    )
    const done = state.completedFocusCount
    return `${done} focus ${done === 1 ? 'phase' : 'phases'} done · long break in ${left}`
  })

  return {
    ...controls,
    primary,
    mode,
    selectMode,
    countdownMinutes,
    hint,
    todayLabel: computed(() => formatShortDuration(todayTotalMs.value)),
    taskLabel: computed(
      () => controls.task.value?.taskTitle ?? 'No task attached',
    ),
  }
}
