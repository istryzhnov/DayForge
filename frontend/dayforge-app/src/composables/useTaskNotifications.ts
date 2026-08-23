import { computed, ref, watch, type Ref } from 'vue'
import type { DailyTask } from '../entities/TaskEntity'
import { TASK_STATUS } from '../entities/constants'
import { getTodayISODate } from './goalSpace/date'
import { isWithinQuietHours, useSettings } from './useSettings'

const NOTIFICATIONS_STORAGE_KEY = 'dayforge-notifications-enabled-v1'
const CHECK_INTERVAL_MS = 15 * 1000
const ALERT_LOOP_MS = 2500

/** How far ahead of a task the reminder fires, as configured. */
function leadWindowMs(): number {
  return useSettings().settings.notifications.leadMinutes * 60 * 1000
}

type AudioContextCtor = typeof AudioContext

// Module-level (singleton) state so enabling once in the morning keeps
// working app-wide for the rest of the day, regardless of the active view.
const isSupported = typeof window !== 'undefined' && 'Notification' in window
const permission = ref<NotificationPermission>(
  isSupported ? Notification.permission : 'denied',
)
const enabled = ref(false)
const activeAlert = ref<DailyTask | null>(null)
const alertQueue = ref<DailyTask[]>([])
const handledKeys = new Set<string>()

let audioCtx: AudioContext | null = null
let alertLoopId: number | undefined
let initialized = false

function getAudioContextCtor(): AudioContextCtor | undefined {
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor })
      .webkitAudioContext
  )
}

function ensureAudioContext(): AudioContext | null {
  if (!audioCtx) {
    const Ctor = getAudioContextCtor()
    if (!Ctor) return null
    audioCtx = new Ctor()
  }
  if (audioCtx.state === 'suspended') void audioCtx.resume()
  return audioCtx
}

// Two short beeps synthesized via Web Audio API — no audio asset needed.
function playBeep() {
  const { sound, volume } = useSettings().settings.notifications
  if (!sound || volume <= 0) return

  const ctx = ensureAudioContext()
  if (!ctx) return
  const now = ctx.currentTime
  // `exponentialRampToValueAtTime` can never reach 0, hence the tiny floor.
  const peak = Math.max(0.0002, 0.35 * volume)
  ;[0, 0.22].forEach((offset) => {
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, now + offset)
    gain.gain.setValueAtTime(0.0001, now + offset)
    gain.gain.exponentialRampToValueAtTime(peak, now + offset + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.2)
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start(now + offset)
    oscillator.stop(now + offset + 0.22)
  })
}

function startAlertLoop() {
  if (alertLoopId) return
  playBeep()
  // A single chime is enough for some people; others want it insistent until
  // they actually look at the screen.
  if (!useSettings().settings.notifications.repeatAlert) return
  alertLoopId = window.setInterval(playBeep, ALERT_LOOP_MS)
}

function stopAlertLoop() {
  if (alertLoopId) {
    window.clearInterval(alertLoopId)
    alertLoopId = undefined
  }
}

function pushBrowserNotification(task: DailyTask) {
  if (!isSupported || permission.value !== 'granted') return
  try {
    const notification = new Notification('Час братися до завдання', {
      body: `«${task.title}» починається о ${task.startTime}`,
      tag: task.id,
    })
    notification.onclick = () => window.focus()
  } catch {
    // Notification constructor can throw in restricted contexts; in-app alert still shows.
  }
}

// Alerts keep looping (sound + popup) until the user explicitly acknowledges them.
function queueAlert(task: DailyTask) {
  pushBrowserNotification(task)
  if (activeAlert.value) {
    alertQueue.value.push(task)
    return
  }
  activeAlert.value = task
  startAlertLoop()
}

function acknowledgeAlert() {
  stopAlertLoop()
  activeAlert.value = alertQueue.value.shift() ?? null
  if (activeAlert.value) startAlertLoop()
}

function checkUpcomingTasks(dailyTasks: DailyTask[]) {
  if (!enabled.value) return
  const today = getTodayISODate()
  const now = new Date()

  // Inside quiet hours nothing is queued at all — deliberately not "queued and
  // held back", which would dump the whole backlog the moment the window ends.
  const { quietHours, quietFrom, quietTo } =
    useSettings().settings.notifications
  if (quietHours && isWithinQuietHours(now, quietFrom, quietTo)) return

  const leadMs = leadWindowMs()

  for (const task of dailyTasks) {
    if (
      task.date !== today ||
      !task.startTime ||
      task.status === TASK_STATUS.DONE
    )
      continue

    const key = `${task.date}::${task.id}::${task.startTime}`
    if (handledKeys.has(key)) continue

    const [hours, minutes] = task.startTime.split(':').map(Number)
    const start = new Date(now)
    start.setHours(hours, minutes, 0, 0)
    const diffMs = start.getTime() - now.getTime()

    if (diffMs > 0 && diffMs <= leadMs) {
      handledKeys.add(key)
      queueAlert(task)
    }
  }
}

// A stored permission grant doesn't unlock audio after a fresh page load —
// browsers require a fresh user gesture, so unlock silently on first interaction.
function unlockAudioOnFirstInteraction() {
  const handler = () => {
    ensureAudioContext()
    document.removeEventListener('pointerdown', handler)
    document.removeEventListener('keydown', handler)
  }
  document.addEventListener('pointerdown', handler)
  document.addEventListener('keydown', handler)
}

function loadEnabledFromStorage(): boolean {
  try {
    return localStorage.getItem(NOTIFICATIONS_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function initialize(dailyTasks: Ref<DailyTask[]>) {
  if (initialized) return
  initialized = true

  enabled.value = loadEnabledFromStorage()
  unlockAudioOnFirstInteraction()

  watch(enabled, (value) => {
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, String(value))
    } catch {
      // Ignore storage write failures (e.g. private browsing).
    }
    if (!value) {
      stopAlertLoop()
      activeAlert.value = null
      alertQueue.value = []
    }
  })

  checkUpcomingTasks(dailyTasks.value)
  window.setInterval(
    () => checkUpcomingTasks(dailyTasks.value),
    CHECK_INTERVAL_MS,
  )
}

// Must be called from a user gesture (click) so the browser allows the
// permission prompt and unlocks audio playback for later, unattended checks.
async function enableNotifications() {
  ensureAudioContext()
  if (isSupported && Notification.permission === 'default') {
    permission.value = await Notification.requestPermission()
  } else if (isSupported) {
    permission.value = Notification.permission
  }
  enabled.value = true
}

function disableNotifications() {
  enabled.value = false
}

/**
 * Global, app-wide task-start reminders. Enable once and it keeps checking
 * for the rest of the day (persisted across reloads) no matter which view is
 * active. Call this once from a long-lived root component — all callers
 * share the same singleton state.
 */
export function useTaskNotifications(dailyTasks: Ref<DailyTask[]>) {
  initialize(dailyTasks)

  return {
    isSupported,
    permission,
    enabled,
    activeAlert,
    pendingCount: computed(() => alertQueue.value.length),
    enableNotifications,
    disableNotifications,
    acknowledgeAlert,
  }
}
