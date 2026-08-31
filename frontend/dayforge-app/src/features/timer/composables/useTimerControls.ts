import { computed } from 'vue'
import { TIMER_MODE, TIMER_STATUS } from '../../../entities/constants'
import { useTimer } from '../../../composables/useTimer'
import { PHASE_LABELS } from '../../../composables/timer/pomodoro'

/** Shared wiring for every surface that drives the one running timer. */
export function useTimerControls() {
  const timer = useTimer()

  const primaryLabel = computed(() => {
    const state = timer.timer.value

    if (state.status === TIMER_STATUS.RUNNING) return 'Pause'
    if (state.status === TIMER_STATUS.PAUSED) return 'Resume'
    if (state.status === TIMER_STATUS.FINISHED) {
      return state.mode === TIMER_MODE.POMODORO && state.phase
        ? `Start ${PHASE_LABELS[state.phase].toLowerCase()}`
        : 'Start again'
    }
    return 'Start'
  })

  /** A finished countdown has nothing queued, so the button starts a new one. */
  function primary() {
    const state = timer.timer.value
    if (
      state.status === TIMER_STATUS.FINISHED &&
      state.mode !== TIMER_MODE.POMODORO
    ) {
      timer.start(state.mode, state.task, state.durationMs)
      return
    }
    timer.toggle()
  }

  return {
    ...timer,
    primaryLabel,
    primary,
    canStop: computed(
      () => timer.timer.value.status !== TIMER_STATUS.IDLE,
    ),
    canSkip: computed(
      () =>
        timer.timer.value.mode === TIMER_MODE.POMODORO &&
        timer.timer.value.status !== TIMER_STATUS.IDLE,
    ),
  }
}
