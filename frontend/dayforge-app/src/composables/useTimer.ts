import { computed, ref, watch } from 'vue'
import type { ID } from '../entities/types'
import type {
  ActiveTimer,
  TimerMode,
  TimerTaskRef,
} from '../entities/TimerEntity'
import { TIMER_MODE, TIMER_STATUS } from '../entities/constants'
import { createId } from './goalSpace/date'
import { readJson, writeJson } from '../lib/storage'
import { useSettings } from './useSettings'
import { useTimeEntries } from './useTimeEntries'
import { playBeep, unlockAudioOnFirstInteraction } from './alertSound'
import {
  catchUp,
  createIdleTimer,
  elapsedMs,
  endsAt,
  isLive,
  isRunning,
  progress,
  remainingMs,
  transition,
  type TimerAction,
  type TimerEffect,
  type TransitionResult,
} from './timer/machine'
import { MINUTE_MS, PHASE_LABELS } from './timer/pomodoro'
import { mustRecordBeforeAdopting } from './timer/remote'
import { formatDuration } from './timer/format'

export const ACTIVE_TIMER_STORAGE_KEY = 'dayforge-timer-active-v1'

/** Fast enough for a smooth progress ring, cheap enough to run all day. */
const TICK_MS = 500

const timer = ref<ActiveTimer>(createIdleTimer())
const now = ref(Date.now())

/** Last sitting that recorded time without a task, still waiting for a name. */
const unnamedSessionId = ref<ID | null>(null)

/** The sitting this device last closed, so another device can tell its stop from a rival start. */
const closedSessionId = ref<ID>('')

let tickId: number | undefined
let expiryId: number | undefined
let initialized = false

function timerSettings() {
  return useSettings().settings.timer
}

function sanitize(input: unknown): ActiveTimer {
  if (typeof input !== 'object' || input === null) return createIdleTimer()

  const raw = input as Partial<ActiveTimer>
  const mode = Object.values(TIMER_MODE).includes(raw.mode as TimerMode)
    ? (raw.mode as TimerMode)
    : TIMER_MODE.STOPWATCH

  if (!Object.values(TIMER_STATUS).includes(raw.status as ActiveTimer['status'])) {
    return createIdleTimer(mode)
  }

  return {
    sessionId: typeof raw.sessionId === 'string' ? raw.sessionId : '',
    mode,
    status: raw.status as ActiveTimer['status'],
    startedAt: typeof raw.startedAt === 'number' ? raw.startedAt : null,
    accumulatedMs:
      typeof raw.accumulatedMs === 'number' && raw.accumulatedMs >= 0
        ? raw.accumulatedMs
        : 0,
    durationMs:
      typeof raw.durationMs === 'number' && raw.durationMs > 0
        ? raw.durationMs
        : undefined,
    phase: raw.phase,
    completedFocusCount:
      typeof raw.completedFocusCount === 'number'
        ? raw.completedFocusCount
        : 0,
    task: raw.task,
  }
}

function notifyPhaseFinished(effects: TimerEffect[]) {
  const finished = effects[effects.length - 1]
  if (!finished) return

  const settings = useSettings().settings
  if (settings.timer.sound) playBeep(settings.notifications.volume)

  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return
  }

  const body = finished.nextPhase
    ? `${PHASE_LABELS[finished.nextPhase]} is up next.`
    : 'The countdown reached zero.'

  try {
    new Notification('DayForge timer', { body, tag: 'dayforge-timer' })
  } catch {
    // Some contexts refuse the constructor; the in-app state still updates.
  }
}

function clearScheduled() {
  if (tickId !== undefined) window.clearInterval(tickId)
  if (expiryId !== undefined) window.clearTimeout(expiryId)
  tickId = undefined
  expiryId = undefined
}

function schedule() {
  clearScheduled()
  if (!isRunning(timer.value)) return

  tickId = window.setInterval(() => {
    now.value = Date.now()
  }, TICK_MS)

  const end = endsAt(timer.value)
  if (end === null) return
  // Background tabs throttle timers, so `sync` also runs on visibility change.
  expiryId = window.setTimeout(sync, Math.max(0, end - Date.now()))
}

function apply(result: TransitionResult) {
  const closing = timer.value
  if (result.entries.length > 0 && !closing.task) {
    unnamedSessionId.value = closing.sessionId
  }
  if (closing.sessionId && closing.sessionId !== result.timer.sessionId) {
    closedSessionId.value = closing.sessionId
  }

  timer.value = result.timer
  now.value = Date.now()
  useTimeEntries().addDrafts(result.entries)
  if (result.effects.length > 0) notifyPhaseFinished(result.effects)
  schedule()
}

function dispatch(action: TimerAction) {
  apply(transition(timer.value, action, Date.now(), timerSettings()))
}

/** Settles whatever ran out while this tab was away. */
function sync() {
  now.value = Date.now()
  const result = catchUp(timer.value, now.value, timerSettings())
  if (result.timer === timer.value && result.entries.length === 0) return
  apply(result)
}

function initialize() {
  if (initialized) return
  initialized = true

  timer.value = sanitize(readJson<unknown>(ACTIVE_TIMER_STORAGE_KEY, null))
  unlockAudioOnFirstInteraction()

  watch(
    timer,
    (value) => {
      writeJson(ACTIVE_TIMER_STORAGE_KEY, value)
    },
    { deep: true },
  )

  window.addEventListener('storage', (event) => {
    if (event.key !== ACTIVE_TIMER_STORAGE_KEY) return
    try {
      timer.value = sanitize(JSON.parse(event.newValue ?? 'null'))
    } catch {
      timer.value = createIdleTimer()
    }
    schedule()
  })

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) sync()
  })
  window.addEventListener('focus', sync)

  sync()
  schedule()
}

export function readActiveTimer(): { timer: ActiveTimer; closedSessionId: ID } {
  initialize()
  return { timer: timer.value, closedSessionId: closedSessionId.value }
}

/**
 * Takes the timer another device left behind. A sitting of our own that the
 * other side never saw is stopped and recorded first, as starting a second
 * timer does on one device; one the other side closed is simply let go.
 */
export function applyRemoteTimer(raw: unknown, remoteClosedSessionId: ID) {
  initialize()
  const incoming = sanitize(raw)

  if (mustRecordBeforeAdopting(timer.value, incoming, remoteClosedSessionId)) {
    dispatch({ type: 'stop' })
  }

  timer.value = incoming
  closedSessionId.value = remoteClosedSessionId
  schedule()
  sync()
}

export function useTimer() {
  initialize()

  const settings = useSettings().settings

  function start(
    mode: TimerMode = timer.value.mode,
    task?: TimerTaskRef,
    durationMs?: number,
  ) {
    unnamedSessionId.value = null
    dispatch({
      type: 'start',
      sessionId: createId('session'),
      mode,
      task: task ?? timer.value.task,
      durationMs,
    })
  }

  function startCountdown(minutes: number, task?: TimerTaskRef) {
    start(TIMER_MODE.COUNTDOWN, task, minutes * MINUTE_MS)
  }

  function pause() {
    dispatch({ type: 'pause' })
  }

  function resume() {
    dispatch({ type: 'resume' })
  }

  function stop() {
    dispatch({ type: 'stop' })
  }

  function skipPhase() {
    dispatch({ type: 'skipPhase' })
  }

  /** One button for the whole lifecycle: start, pause, carry on. */
  function toggle() {
    if (timer.value.status === TIMER_STATUS.RUNNING) {
      pause()
      return
    }
    if (
      timer.value.status === TIMER_STATUS.PAUSED ||
      timer.value.status === TIMER_STATUS.FINISHED
    ) {
      resume()
      return
    }
    start()
  }

  function isActiveTask(taskId: ID): boolean {
    return isLive(timer.value) && timer.value.task?.taskId === taskId
  }

  /** Starting on another task stops the running one, one timer at a time. */
  function toggleForTask(task: TimerTaskRef) {
    if (isActiveTask(task.taskId)) {
      stop()
      return
    }
    start(timer.value.mode, task)
  }

  function clearTask() {
    timer.value = { ...timer.value, task: undefined }
  }

  /**
   * Gives the running — or just-finished — sitting a task, and moves the time
   * it already recorded onto it.
   */
  function attachTask(task: TimerTaskRef) {
    const sessionId =
      timer.value.status === TIMER_STATUS.IDLE
        ? unnamedSessionId.value
        : timer.value.sessionId

    if (sessionId) useTimeEntries().assignSessionToTask(sessionId, task)

    timer.value = { ...timer.value, task }
    unnamedSessionId.value = null
  }

  /** Arming a mode without starting it; a live timer switches by restarting. */
  function setMode(mode: TimerMode) {
    if (isLive(timer.value)) {
      start(mode)
      return
    }
    timer.value = { ...createIdleTimer(mode), task: timer.value.task }
    schedule()
  }

  function handleTaskRemoved(taskId: ID) {
    if (timer.value.task?.taskId !== taskId) return
    if (isLive(timer.value)) stop()
    clearTask()
  }

  function handleGoalRemoved(goalId: ID) {
    if (timer.value.task?.goalId !== goalId) return
    if (isLive(timer.value)) stop()
    clearTask()
  }

  const elapsed = computed(() => elapsedMs(timer.value, now.value))
  const remaining = computed(() => remainingMs(timer.value, now.value))

  /** The stretch that is running and not yet written to history. */
  const currentStretchMs = computed(() =>
    isRunning(timer.value)
      ? Math.max(0, now.value - (timer.value.startedAt ?? now.value))
      : 0,
  )

  const trackedTodayMs = computed(() => {
    const task = timer.value.task
    if (!task) return 0
    return useTimeEntries().totalForTaskToday(task.taskId)
  })

  /**
   * What the big digits show: time left when there is a target, else time
   * spent. A stopwatch on a task picks up where the task left off today
   * rather than starting over — every pause is already in history, so only
   * the running stretch is added on top.
   */
  const displayMs = computed(() => {
    if (remaining.value !== null) return remaining.value
    if (!timer.value.task) return elapsed.value
    return trackedTodayMs.value + currentStretchMs.value
  })

  const statusLabel = computed(() => {
    if (timer.value.mode === TIMER_MODE.POMODORO && timer.value.phase) {
      return PHASE_LABELS[timer.value.phase]
    }
    if (timer.value.mode === TIMER_MODE.COUNTDOWN) return 'Countdown'
    return 'Stopwatch'
  })

  return {
    timer,
    now,
    settings,
    elapsed,
    remaining,
    displayMs,
    displayLabel: computed(() => formatDuration(displayMs.value)),
    progress: computed(() => progress(timer.value, now.value)),
    statusLabel,
    isRunning: computed(() => isRunning(timer.value)),
    isLive: computed(() => isLive(timer.value)),
    isIdle: computed(() => timer.value.status === TIMER_STATUS.IDLE),
    isFinished: computed(() => timer.value.status === TIMER_STATUS.FINISHED),
    task: computed(() => timer.value.task),
    /** Time has been, or is being, recorded with nothing to file it under. */
    canNameSession: computed(
      () =>
        !timer.value.task &&
        (timer.value.status !== TIMER_STATUS.IDLE ||
          unnamedSessionId.value !== null),
    ),
    attachTask,
    start,
    startCountdown,
    pause,
    resume,
    stop,
    skipPhase,
    toggle,
    toggleForTask,
    isActiveTask,
    clearTask,
    setMode,
    handleTaskRemoved,
    handleGoalRemoved,
  }
}
