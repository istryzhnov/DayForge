import { computed } from 'vue'
import type { TimerMode } from '../../../entities/TimerEntity'
import { TIMER_MODE, TIMER_STATUS } from '../../../entities/constants'
import { useSettings } from '../../../composables/useSettings'
import { useTimer } from '../../../composables/useTimer'
import { useTimeEntries } from '../../../composables/useTimeEntries'
import {
  formatDuration,
  formatShortDuration,
} from '../../../composables/timer/format'
import {
  PHASE_LABELS,
  focusesUntilLongBreak,
} from '../../../composables/timer/pomodoro'

export const COUNTDOWN_PRESETS = [5, 10, 15, 25, 45, 60]

export const MODE_OPTIONS: { id: TimerMode; label: string }[] = [
  { id: TIMER_MODE.STOPWATCH, label: 'Stopwatch' },
  { id: TIMER_MODE.COUNTDOWN, label: 'Countdown' },
  { id: TIMER_MODE.POMODORO, label: 'Pomodoro' },
]

export function useTimerView() {
  const timer = useTimer()
  const { settings, update } = useSettings()
  const { todayTotalMs } = useTimeEntries()

  /**
   * The countdown length picked on the timer itself. It is remembered as the
   * default, so the next countdown starts from it without a trip to Settings.
   */
  const countdownMinutes = computed({
    get: () => settings.timer.defaultCountdownMinutes,
    set: (minutes: number) =>
      update('timer', { defaultCountdownMinutes: minutes }),
  })

  const mode = computed(() => timer.timer.value.mode)

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
  function resumeOrStart() {
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

  function selectMode(next: TimerMode) {
    if (next === mode.value) return
    timer.setMode(next)
  }

  /** An idle countdown starts on the length picked here, not the stored one. */
  function primary() {
    if (timer.isIdle.value && mode.value === TIMER_MODE.COUNTDOWN) {
      timer.startCountdown(countdownMinutes.value)
      return
    }
    resumeOrStart()
  }

  const hint = computed(() => {
    const state = timer.timer.value
    if (state.mode !== TIMER_MODE.POMODORO) return ''

    const left = focusesUntilLongBreak(
      state.completedFocusCount,
      settings.timer,
    )
    const done = state.completedFocusCount
    return `${done} focus ${done === 1 ? 'phase' : 'phases'} done · long break in ${left}`
  })

  return {
    ...timer,
    primaryLabel,
    primary,
    resumeOrStart,
    mode,
    selectMode,
    countdownMinutes,
    /** An idle countdown shows the length it will start from, not 00:00. */
    dialLabel: computed(() =>
      timer.isIdle.value && mode.value === TIMER_MODE.COUNTDOWN
        ? formatDuration(countdownMinutes.value * 60_000)
        : timer.displayLabel.value,
    ),
    hint,
    canStop: computed(() => timer.timer.value.status !== TIMER_STATUS.IDLE),
    canSkip: computed(
      () =>
        timer.timer.value.mode === TIMER_MODE.POMODORO &&
        timer.timer.value.status !== TIMER_STATUS.IDLE,
    ),
    todayLabel: computed(() => formatShortDuration(todayTotalMs.value)),
    todayTotalMs,
    taskLabel: computed(
      () => timer.task.value?.taskTitle ?? 'No task attached',
    ),
  }
}
