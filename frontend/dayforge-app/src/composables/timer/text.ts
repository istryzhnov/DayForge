/**
 * Translated timer words for the interface language. The pure helpers in this
 * folder stay English-only so the compat checks can load them without the i18n
 * setup, and the UI passes these words in where it shows a duration or a label.
 */
import { i18n } from '../../i18n'
import { POMODORO_PHASE, TIMER_MODE } from '../../entities/constants'
import type { PomodoroPhase, TimerMode } from '../../entities/TimerEntity'
import type { DurationWords } from './format'
import type { AwayTimeWords } from './reminders'
import type { SummaryLabels } from './analytics'

/** Short unit words for totals, such as "1 h 20 m" or "45 s". */
export function durationWords(): DurationWords {
  return {
    hours: i18n.global.t('timer.unitHour'),
    minutes: i18n.global.t('timer.unitMinuteShort'),
    seconds: i18n.global.t('timer.unitSecondShort'),
  }
}

/** Unit words for the away prompt, such as "1 h 20 min". */
export function awayTimeWords(): AwayTimeWords {
  return {
    hours: i18n.global.t('timer.unitHour'),
    minutes: i18n.global.t('timer.unitMinute'),
    lessThanMinute: i18n.global.t('timer.awayLessThanMinute'),
  }
}

const MODE_LABEL_KEYS: Record<TimerMode, string> = {
  [TIMER_MODE.STOPWATCH]: 'timer.modeStopwatch',
  [TIMER_MODE.COUNTDOWN]: 'timer.modeCountdown',
  [TIMER_MODE.POMODORO]: 'timer.modePomodoro',
}

export function modeLabel(mode: TimerMode): string {
  return i18n.global.t(MODE_LABEL_KEYS[mode])
}

const PHASE_LABEL_KEYS: Record<PomodoroPhase, string> = {
  [POMODORO_PHASE.FOCUS]: 'timer.phaseFocus',
  [POMODORO_PHASE.SHORT_BREAK]: 'timer.phaseShortBreak',
  [POMODORO_PHASE.LONG_BREAK]: 'timer.phaseLongBreak',
}

const START_PHASE_KEYS: Record<PomodoroPhase, string> = {
  [POMODORO_PHASE.FOCUS]: 'timer.startFocus',
  [POMODORO_PHASE.SHORT_BREAK]: 'timer.startShortBreak',
  [POMODORO_PHASE.LONG_BREAK]: 'timer.startLongBreak',
}

export function phaseLabel(phase: PomodoroPhase): string {
  return i18n.global.t(PHASE_LABEL_KEYS[phase])
}

/** "Start focus", "Start short break", "Start long break". */
export function startPhaseLabel(phase: PomodoroPhase): string {
  return i18n.global.t(START_PHASE_KEYS[phase])
}

/** Names for the summary buckets that have no title of their own. */
export function summaryLabels(): SummaryLabels {
  return {
    untrackedTask: i18n.global.t('analytics.withoutTask'),
    noProject: i18n.global.t('analytics.noProject'),
    deletedProject: i18n.global.t('analytics.deletedProject'),
  }
}
