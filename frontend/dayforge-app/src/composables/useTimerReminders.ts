import { ref, type Ref } from 'vue'
import type { DailyTask } from '../entities/TaskEntity'
import type { ID, ISODate } from '../entities/types'
import type { TimerTaskRef } from '../entities/TimerEntity'
import { readJson, writeJson } from '../lib/storage'
import { getTodayISODate } from './goalSpace/date'
import { hasExpired, isLive, isRunning } from './timer/machine'
import { MINUTE_MS } from './timer/pomodoro'
import {
  awayWindowFromStorage,
  awayWindowFromTickGap,
  crossedMidnight,
  isEndOfDay,
  isLongRunDue,
  mergeAwayWindows,
  sameStretch,
  sittingRunningMs,
  sittingStartMs,
  type AwayRecord,
  type AwayWindow,
  type StretchKey,
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
/** Where the last-seen mark lives, so a reload or a closed tab can still show away time. */
const AWAY_RECORD_STORAGE_KEY = 'dayforge-timer-away-v1'
const TICK_MS = 1000
/** A visible page refreshes the stored mark this often, not every tick. */
const AWAY_SAVE_MS = 15_000

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

/** Last tick's time and stretch; a jump between ticks means the machine slept. */
let lastTick: { at: number; running: StretchKey | null } | null = null
/** Whether this page has written an away record that still needs clearing. */
let awayRecordOpen = false
let lastAwaySavedAt = 0
/** Return time of the last answered prompt; earlier windows are already decided. */
let answeredThrough = 0

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

/**
 * The stretch that is running right now. A countdown already past its end
 * does not count: the timer stops it at its exact end, so nothing is away.
 */
function runningStretch(now: number): StretchKey | null {
  if (!timerApi) return null
  const state = timerApi.timer.value
  if (!isRunning(state) || state.startedAt === null) return null
  if (hasExpired(state, now)) return null
  return { sessionId: state.sessionId, startedAt: state.startedAt }
}

function awayIdleMinutes(): number {
  return useSettings().settings.timer.idleReturnMinutes
}

function readAwayRecord(): AwayRecord | null {
  const raw = readJson<unknown>(AWAY_RECORD_STORAGE_KEY, null)
  if (typeof raw !== 'object' || raw === null) return null

  const data = raw as Partial<AwayRecord>
  if (
    typeof data.sessionId !== 'string' ||
    typeof data.startedAt !== 'number' ||
    typeof data.seenAt !== 'number'
  ) {
    return null
  }
  return {
    sessionId: data.sessionId,
    startedAt: data.startedAt,
    seenAt: data.seenAt,
  }
}

/** Writes the last-seen mark, so a reload or a closed tab still knows when the app was last here. */
function saveAwayRecord(running: StretchKey, now: number) {
  writeJson(AWAY_RECORD_STORAGE_KEY, { ...running, seenAt: now })
  awayRecordOpen = true
  lastAwaySavedAt = now
}

function clearAwayRecord() {
  lastAwaySavedAt = 0
  if (!awayRecordOpen) return
  writeJson(AWAY_RECORD_STORAGE_KEY, null)
  awayRecordOpen = false
}

/**
 * Raises the prompt for an away window. While a prompt for the same stretch is
 * on screen, a window that starts earlier only moves its start back.
 */
function raiseAway(stretch: StretchKey, away: AwayWindow) {
  if (away.hiddenAt < answeredThrough) return

  const open = awayPrompt.value
  if (open && sameStretch(open, stretch)) {
    const merged = mergeAwayWindows(open, away)
    if (merged.hiddenAt !== open.hiddenAt) {
      awayPrompt.value = { ...open, hiddenAt: merged.hiddenAt }
    }
    return
  }

  awayPrompt.value = { ...stretch, ...away }
}

/**
 * Sleep or a locked screen: no visibility change fires, so the jump between two
 * ticks is the away time. Also keeps the stored last-seen mark fresh while visible.
 */
function checkAway(now: number) {
  const running = runningStretch(now)
  const idleMinutes = awayIdleMinutes()

  const away = awayWindowFromTickGap(lastTick, now, running, idleMinutes)
  lastTick = { at: now, running }
  if (away && running) raiseAway(running, away)

  if (!running || idleMinutes === 0) {
    clearAwayRecord()
    return
  }
  // A hidden page keeps the mark from when it was hidden, so that time stays away.
  if (document.hidden) return
  if (now - lastAwaySavedAt >= AWAY_SAVE_MS) saveAwayRecord(running, now)
}

function tick() {
  const now = Date.now()
  const tasks = tasksRef?.value ?? []
  checkLongRunning(now)
  checkPlannedStart(tasks, now)
  checkEndOfDay(tasks, now)
  checkAway(now)
}

/** Closing or reloading a visible page: its last moment in view is the mark. */
function onPageHide() {
  if (document.hidden) return
  const running = runningStretch(Date.now())
  if (running && awayIdleMinutes() > 0) {
    saveAwayRecord(running, Date.now())
  } else {
    clearAwayRecord()
  }
}

function onVisibilityChange() {
  if (!timerApi) return

  if (document.hidden) {
    const now = Date.now()
    const running = runningStretch(now)
    const idleMinutes = awayIdleMinutes()
    if (running && idleMinutes > 0) {
      hiddenMark = { at: now, ...running, idleMinutes }
      saveAwayRecord(running, now)
    } else {
      hiddenMark = null
      clearAwayRecord()
    }
    return
  }

  const mark = hiddenMark
  hiddenMark = null
  clearAwayRecord()
  if (!mark) return

  const returnedAt = Date.now()
  const away = awayWindowFromStorage(
    { sessionId: mark.sessionId, startedAt: mark.startedAt, seenAt: mark.at },
    returnedAt,
    runningStretch(returnedAt),
    mark.idleMinutes,
  )
  if (away) raiseAway(mark, away)
}

/** The prompt is only acted on while the same stretch is still running. */
function awayPromptStillValid(prompt: AwayPrompt): boolean {
  return sameStretch(prompt, runningStretch(Date.now()))
}

/** Closes the prompt, and makes sure its window is never raised again. */
function closeAwayPrompt(prompt: AwayPrompt) {
  awayPrompt.value = null
  answeredThrough = prompt.returnedAt
  clearAwayRecord()
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
  window.addEventListener('pagehide', onPageHide)
  restoreAway()
  window.setInterval(tick, TICK_MS)
  tick()
}

/**
 * A reload or a closed tab: the stored mark says when the app was last seen.
 * Read once, then cleared; the next visible tick writes a fresh one.
 */
function restoreAway() {
  const record = readAwayRecord()
  writeJson(AWAY_RECORD_STORAGE_KEY, null)

  const away = awayWindowFromStorage(
    record,
    Date.now(),
    runningStretch(Date.now()),
    awayIdleMinutes(),
  )
  if (record && away) raiseAway(record, away)
}

export function useTimerReminders() {
  return {
    awayPrompt,
    /** The timer kept counting; nothing changes. */
    keepAway() {
      const prompt = awayPrompt.value
      if (prompt) closeAwayPrompt(prompt)
    },
    /** Cuts the away window out of the running stretch. */
    discardAway() {
      const prompt = awayPrompt.value
      if (!prompt) return
      closeAwayPrompt(prompt)
      if (!awayPromptStillValid(prompt)) return
      timerApi?.discardAwayTime(prompt.hiddenAt, prompt.returnedAt)
    },
    /** Ends the sitting at the moment the tab was hidden. */
    discardAndStopAway() {
      const prompt = awayPrompt.value
      if (!prompt) return
      closeAwayPrompt(prompt)
      if (!awayPromptStillValid(prompt)) return
      timerApi?.stopAt(prompt.hiddenAt)
    },
  }
}
