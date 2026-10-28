import { ref, type Ref } from 'vue'
import type { DailyTask } from '../entities/TaskEntity'
import type { ID, ISODate } from '../entities/types'
import type { TimerTaskRef } from '../entities/TimerEntity'
import { readJson, writeJson } from '../lib/storage'
import { getTodayISODate } from './goalSpace/date'
import { isLive, isRunning } from './timer/machine'
import { MINUTE_MS } from './timer/pomodoro'
import {
  crossedMidnight,
  isAwayLongEnough,
  isEndOfDay,
  isLongRunDue,
  sittingRunningMs,
  sittingStartMs,
} from './timer/reminders'
import { i18n } from '../i18n'
import {
  blockFromTask,
  localMs,
  loggableBlocks,
  pickPlannedStart,
} from './timer/plannedBlocks'
import { useFormat } from './useFormat'
import { useLogPlanned } from './useLogPlanned'
import { requestEntryEdit } from './entryEditRequest'
import { useTimer } from './useTimer'
import { useTimeEntries } from './useTimeEntries'
import { isWithinQuietHours, useSettings } from './useSettings'
import { useUndoToast } from './useUndoToast'

const REMINDERS_STORAGE_KEY = 'dayforge-timer-reminders-v1'
const TICK_MS = 1000

interface StoredReminders {
  /** Blocks the user waved away, per day. Only today's list is kept. */
  dismissed: Record<ISODate, ID[]>
  /** The day the end-of-day nudge last appeared. */
  endOfDayNudgeDate?: ISODate
}

export interface AwayPrompt {
  sessionId: ID
  startedAt: number
  hiddenAt: number
  returnedAt: number
}

const awayPrompt = ref<AwayPrompt | null>(null)

/** Reminder keys already shown this session, so each fires once. */
const shownThisSession = new Set<string>()

let hiddenMark: {
  at: number
  sessionId: ID
  startedAt: number
  idleMinutes: number
} | null = null

let stored: StoredReminders = { dismissed: {} }
let initialized = false
let tasksRef: Ref<DailyTask[]> | null = null
let timerApi: ReturnType<typeof useTimer> | null = null

function loadStored(): StoredReminders {
  const raw = readJson<unknown>(REMINDERS_STORAGE_KEY, null)
  if (typeof raw !== 'object' || raw === null) return { dismissed: {} }

  const data = raw as Partial<StoredReminders>
  const dismissed =
    typeof data.dismissed === 'object' && data.dismissed !== null
      ? data.dismissed
      : {}
  return {
    dismissed,
    endOfDayNudgeDate:
      typeof data.endOfDayNudgeDate === 'string'
        ? data.endOfDayNudgeDate
        : undefined,
  }
}

function persist() {
  writeJson(REMINDERS_STORAGE_KEY, stored)
}

function isDismissed(date: ISODate, taskId: ID): boolean {
  return stored.dismissed[date]?.includes(taskId) ?? false
}

function dismissBlock(date: ISODate, taskId: ID) {
  const today = [...(stored.dismissed[date] ?? []), taskId]
  stored = { ...stored, dismissed: { [date]: [...new Set(today)] } }
  persist()
}

/** A browser notification only when permission was already granted; never asks. */
function notifyBrowser(title: string, body: string, tag: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, tag })
  } catch {
    // Some contexts refuse the constructor; the in-app toast still shows.
  }
}

/** Runs `show` the first time `key` comes up this session. */
function once(key: string, show: () => void) {
  if (shownThisSession.has(key)) return
  shownThisSession.add(key)
  show()
}

function subjectOf(task: TimerTaskRef | undefined): string {
  return task
    ? i18n.global.t('timer.subjectTask', { title: task.taskTitle })
    : i18n.global.t('timer.subjectNone')
}

/** The three choices offered when a sitting runs long or past midnight. */
function stopChoices(sessionId: ID) {
  return [
    { label: i18n.global.t('timer.keepGoing'), run: () => {} },
    {
      label: i18n.global.t('timer.stopNow'),
      run: () => stopSitting(sessionId, false),
    },
    {
      label: i18n.global.t('timer.stopAt'),
      run: () => stopSitting(sessionId, true),
    },
  ]
}

function stopSitting(sessionId: ID, thenEdit: boolean) {
  if (!timerApi) return
  const state = timerApi.timer.value
  if (state.sessionId !== sessionId || !isLive(state)) return

  timerApi.stop()
  if (!thenEdit) return

  const latest = useTimeEntries()
    .entries.value.filter((entry) => entry.sessionId === sessionId)
    .sort((a, b) => Date.parse(b.endedAt) - Date.parse(a.endedAt))[0]
  if (latest) requestEntryEdit(latest)
}

function checkLongRunning(now: number) {
  const hours = useSettings().settings.timer.longRunHours
  if (hours === 0 || !timerApi) return

  const state = timerApi.timer.value
  if (!isRunning(state) || state.startedAt === null) return

  const toast = useUndoToast()
  const entries = useTimeEntries().entries.value
  const sessionId = state.sessionId
  const subject = subjectOf(state.task)
  const stretch = now - state.startedAt

  const runningMs = sittingRunningMs(entries, sessionId, stretch)
  if (isLongRunDue(runningMs, hours)) {
    once(`${sessionId}:long:${hours}`, () => {
      const message = i18n.global.t('timer.runningLong', {
        subject,
        hours,
      })
      notifyBrowser(
        i18n.global.t('timer.notificationTitle'),
        message,
        `long-${sessionId}`,
      )
      toast.offerChoices(message, stopChoices(sessionId), { sticky: true })
    })
  }

  const sittingStart = sittingStartMs(entries, sessionId, state.startedAt)
  if (crossedMidnight(sittingStart, now)) {
    once(`${sessionId}:midnight`, () => {
      notifyBrowser(
        i18n.global.t('timer.notificationTitle'),
        i18n.global.t('timer.midnightBody'),
        `midnight-${sessionId}`,
      )
      toast.offerChoices(
        i18n.global.t('timer.midnightRunning', { subject }),
        stopChoices(sessionId),
        { sticky: true },
      )
    })
  }
}

function startPlanned(task: DailyTask, fromBlockStart: boolean) {
  if (!timerApi || isLive(timerApi.timer.value)) return
  const startedAt =
    fromBlockStart && task.startTime
      ? localMs(task.date, task.startTime)
      : undefined

  timerApi.start(
    timerApi.timer.value.mode,
    { taskId: task.templateId, goalId: task.goalId, taskTitle: task.title },
    undefined,
    startedAt,
  )
}

function checkPlannedStart(tasks: DailyTask[], now: number) {
  if (!useSettings().settings.notifications.plannedStartReminder) return
  if (!timerApi || isLive(timerApi.timer.value)) return
  if (useUndoToast().pending.value) return

  const { quietHours, quietFrom, quietTo } =
    useSettings().settings.notifications
  if (quietHours && isWithinQuietHours(new Date(now), quietFrom, quietTo))
    return

  const today = getTodayISODate()
  const task = pickPlannedStart(
    tasks,
    today,
    now,
    useTimeEntries().entries.value,
    (candidate) =>
      isDismissed(today, candidate.id) ||
      shownThisSession.has(`planned:${candidate.id}`),
  )
  if (!task || !task.startTime) return

  shownThisSession.add(`planned:${task.id}`)
  const minutes = Math.floor((now - localMs(today, task.startTime)) / MINUTE_MS)
  const { formatTime } = useFormat()

  notifyBrowser(
    i18n.global.t('timer.notificationTitle'),
    i18n.global.t('timer.plannedStartedAgo', { title: task.title, minutes }),
    `planned-${task.id}`,
  )
  useUndoToast().offerChoices(
    i18n.global.t('timer.plannedStartedAsk', { title: task.title, minutes }),
    [
      {
        label: i18n.global.t('timer.startNow'),
        run: () => startPlanned(task, false),
      },
      {
        label: i18n.global.t('timer.startFrom', {
          time: formatTime(task.startTime),
        }),
        run: () => startPlanned(task, true),
      },
      {
        label: i18n.global.t('timer.dismiss'),
        run: () => dismissBlock(today, task.id),
      },
    ],
    { sticky: true },
  )
}

function checkEndOfDay(tasks: DailyTask[], now: number) {
  if (!useSettings().settings.notifications.endOfDayNudge) return
  const { endOfDayTime } = useSettings().settings.notifications
  if (!isEndOfDay(new Date(now), endOfDayTime)) return

  const today = getTodayISODate()
  if (stored.endOfDayNudgeDate === today) return
  if (useUndoToast().pending.value) return

  const blocks = tasks.filter((task) => task.date === today).map(blockFromTask)
  const count = loggableBlocks(
    blocks,
    useTimeEntries().entries.value,
    now,
  ).length
  if (count === 0) return

  stored = { ...stored, endOfDayNudgeDate: today }
  persist()

  useUndoToast().offerChoices(
    i18n.global.t('timer.plannedNudge', count),
    [
      {
        label: i18n.global.t('timer.logAll'),
        run: () => useLogPlanned().logBlocks(blocks),
      },
      { label: i18n.global.t('timer.dismiss'), run: () => {} },
    ],
    { sticky: true },
  )
}

function tick() {
  const now = Date.now()
  const tasks = tasksRef?.value ?? []
  checkLongRunning(now)
  checkPlannedStart(tasks, now)
  checkEndOfDay(tasks, now)
}

function onVisibilityChange() {
  if (!timerApi) return

  if (document.hidden) {
    const state = timerApi.timer.value
    const idleMinutes = useSettings().settings.timer.idleReturnMinutes
    hiddenMark =
      isRunning(state) && state.startedAt !== null && idleMinutes > 0
        ? {
            at: Date.now(),
            sessionId: state.sessionId,
            startedAt: state.startedAt,
            idleMinutes,
          }
        : null
    return
  }

  const mark = hiddenMark
  hiddenMark = null
  if (!mark) return

  const returnedAt = Date.now()
  const state = timerApi.timer.value
  const stillSame =
    isRunning(state) &&
    state.sessionId === mark.sessionId &&
    state.startedAt === mark.startedAt
  if (!stillSame) return
  if (!isAwayLongEnough(returnedAt - mark.at, mark.idleMinutes)) return

  awayPrompt.value = {
    sessionId: mark.sessionId,
    startedAt: mark.startedAt,
    hiddenAt: mark.at,
    returnedAt,
  }
}

/** The prompt is only acted on while the same stretch is still running. */
function awayPromptStillValid(prompt: AwayPrompt): boolean {
  if (!timerApi) return false
  const state = timerApi.timer.value
  return (
    isRunning(state) &&
    state.sessionId === prompt.sessionId &&
    state.startedAt === prompt.startedAt
  )
}

/**
 * Starts the reminders once, from the main page. Everything here runs only
 * while the app is open, in a tab or an installed app.
 */
export function initTimerReminders(dailyTasks: Ref<DailyTask[]>) {
  if (initialized) return
  initialized = true

  tasksRef = dailyTasks
  stored = loadStored()
  timerApi = useTimer()

  document.addEventListener('visibilitychange', onVisibilityChange)
  window.setInterval(tick, TICK_MS)
  tick()
}

export function useTimerReminders() {
  return {
    awayPrompt,
    /** The timer kept counting; nothing changes. */
    keepAway() {
      awayPrompt.value = null
    },
    /** Cuts the away window out of the running stretch. */
    discardAway() {
      const prompt = awayPrompt.value
      awayPrompt.value = null
      if (!prompt || !timerApi || !awayPromptStillValid(prompt)) return
      timerApi.discardAwayTime(prompt.hiddenAt, prompt.returnedAt)
    },
    /** Ends the sitting at the moment the tab was hidden. */
    discardAndStopAway() {
      const prompt = awayPrompt.value
      awayPrompt.value = null
      if (!prompt || !timerApi || !awayPromptStillValid(prompt)) return
      timerApi.stopAt(prompt.hiddenAt)
    },
  }
}
