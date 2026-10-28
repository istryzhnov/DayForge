import { computed, ref, watch, type Ref } from 'vue'
import type { DailyTask } from '../entities/TaskEntity'
import { TASK_STATUS } from '../entities/constants'
import { i18n } from '../i18n'
import { getTodayISODate } from './goalSpace/date'
import { isWithinQuietHours, useSettings } from './useSettings'
import {
  ensureAudioContext,
  playBeep as playAlertSound,
  unlockAudioOnFirstInteraction,
} from './alertSound'

const NOTIFICATIONS_STORAGE_KEY = 'dayforge-notifications-enabled-v1'
const CHECK_INTERVAL_MS = 15 * 1000
const ALERT_LOOP_MS = 2500

/** How far ahead of a task the reminder fires, as configured. */
function leadWindowMs(): number {
  return useSettings().settings.notifications.leadMinutes * 60 * 1000
}

const isSupported = typeof window !== 'undefined' && 'Notification' in window
const permission = ref<NotificationPermission>(
  isSupported ? Notification.permission : 'denied',
)
const enabled = ref(false)
const activeAlert = ref<DailyTask | null>(null)
const alertQueue = ref<DailyTask[]>([])
const handledKeys = new Set<string>()

let alertLoopId: number | undefined
let initialized = false

function playBeep() {
  const { sound, volume } = useSettings().settings.notifications
  if (!sound) return
  playAlertSound(volume)
}

function startAlertLoop() {
  if (alertLoopId) return
  playBeep()
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
    const notification = new Notification(i18n.global.t('tasks.notifyTitle'), {
      body: i18n.global.t('tasks.notifyBody', {
        title: task.title,
        time: task.startTime ?? '',
      }),
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
