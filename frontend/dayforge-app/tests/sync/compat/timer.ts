/** Compat checks: timer reminders, history labels and push reminder parity with the server. */

import {
  crossedMidnight,
  formatAwayTime,
  isAwayLongEnough,
  isEndOfDay,
  isLongRunDue,
  plannedNudgeLabel,
  sittingRunningMs,
  sittingStartMs,
  splitStretchAroundAway,
} from '../../../src/composables/timer/reminders'
import {
  blockLogState,
  localMs,
  loggableBlocks,
  pickPlannedStart,
  planBlockEntry,
  type PlannedBlock,
} from '../../../src/composables/timer/plannedBlocks'
import {
  decideReminders,
  isEndOfDayMinutes,
  isLongRunDue as serverIsLongRunDue,
  isWithinQuietMinutes,
  loggableCount,
  pickPlannedStart as serverPickPlannedStart,
  PLANNED_START_GRACE_MS as SERVER_PLANNED_START_GRACE_MS,
  plannedNudgeLabel as serverPlannedNudgeLabel,
  sittingRunningMs as serverSittingRunningMs,
  type Clock,
  type ServerTask,
  type ServerTimer,
} from '../../../../../supabase/functions/push-reminders/rules'
import { createIdleTimer, transition } from '../../../src/composables/timer/machine'
import { DEFAULT_SETTINGS, isWithinQuietHours } from '../../../src/composables/useSettings'
import type { DailyTask } from '../../../src/entities/TaskEntity'
import { formatDayHeading, formatEntryDuration } from '../../../src/composables/timer/format'
import { TIMER_MODE } from '../../../src/entities/constants'
import type { TimeEntry } from '../../../src/entities/TimerEntity'
import { T0, check, same, section } from './harness'

const MIN = 60 * 1000
const HOUR = 60 * MIN

function localAt(year: number, month: number, day: number, hours: number, minutes: number): number {
  return new Date(year, month - 1, day, hours, minutes).getTime()
}

function entryAt(sessionId: string, startedAt: number, endedAt: number, taskId?: string): TimeEntry {
  return {
    id: `entry-${sessionId}-${startedAt}`,
    sessionId,
    startedAt: new Date(startedAt).toISOString(),
    endedAt: new Date(endedAt).toISOString(),
    mode: TIMER_MODE.STOPWATCH,
    taskId,
    source: 'timer',
    updatedAt: T0,
  } as TimeEntry
}

function blockTask(id: string, date: string, startTime: string | undefined, endTime: string | undefined, status = 'todo'): DailyTask {
  return {
    id: `${id}::${date}`,
    date,
    templateId: id,
    title: `Block ${id}`,
    priority: 'minor',
    tagIds: [],
    status,
    startTime,
    endTime,
  } as DailyTask
}

export function verifyTimerReminders() {
  section('Timer reminders: long runs, away time, planned blocks')

  check('a long run is not due before its threshold', !isLongRunDue(3 * HOUR - 1, 3))
  check('a long run is due exactly at its threshold', isLongRunDue(3 * HOUR, 3))
  check('a long run never fires when switched off', !isLongRunDue(9 * HOUR, 0))

  const sitting = 'sit-a'
  const entries = [
    entryAt(sitting, localAt(2026, 10, 21, 8, 0), localAt(2026, 10, 21, 9, 0)),
    entryAt(sitting, localAt(2026, 10, 21, 9, 30), localAt(2026, 10, 21, 10, 0)),
    entryAt('sit-b', localAt(2026, 10, 21, 6, 0), localAt(2026, 10, 21, 11, 0)),
  ]
  check(
    'a sitting counts its recorded stretches and the running one, not other sittings',
    sittingRunningMs(entries, sitting, 10 * MIN) === 100 * MIN,
  )
  check(
    'a sitting is dated from its earliest recorded stretch',
    sittingStartMs(entries, sitting, localAt(2026, 10, 21, 10, 5)) === localAt(2026, 10, 21, 8, 0),
  )
  check(
    'a run that began the day before has crossed midnight',
    crossedMidnight(localAt(2026, 10, 24, 23, 50), localAt(2026, 10, 25, 0, 10)),
  )
  check(
    'a run that began and is still going the same day has not',
    !crossedMidnight(localAt(2026, 10, 24, 8, 0), localAt(2026, 10, 24, 23, 59)),
  )

  check('an away spell shorter than the threshold is ignored', !isAwayLongEnough(15 * MIN - 1, 15))
  check('an away spell at the threshold asks', isAwayLongEnough(15 * MIN, 15))
  check('away prompts never fire when switched off', !isAwayLongEnough(5 * HOUR, 0))

  const split = splitStretchAroundAway(0, 40 * MIN, 100 * MIN)
  check('only the time before the tab was hidden is kept', split.keptEndsAt === 40 * MIN)
  check('the timer resumes at the moment of return', split.resumeAt === 100 * MIN)
  check(
    'a stretch that started during the away spell keeps nothing',
    splitStretchAroundAway(50 * MIN, 40 * MIN, 100 * MIN).keptEndsAt === null,
  )

  const settings = DEFAULT_SETTINGS.timer
  const timer = transition(createIdleTimer(), { type: 'start', sessionId: 'trim', mode: TIMER_MODE.STOPWATCH }, 0, settings).timer
  const pausedAway = transition(timer, { type: 'pause' }, 40 * MIN, settings)
  const resumed = transition(pausedAway.timer, { type: 'resume' }, 100 * MIN, settings)
  const stopped = transition(resumed.timer, { type: 'stop' }, 130 * MIN, settings)
  const trimmed = [...pausedAway.entries, ...stopped.entries].reduce(
    (total, draft) => total + (draft.endedAt - draft.startedAt),
    0,
  )
  check('discarding the away time leaves only the minutes that were actually worked', trimmed === 70 * MIN, trimmed / MIN)

  check('away time reads as an hour and minutes', formatAwayTime(80 * MIN) === '1 h 20 min')
  check('away time under an hour reads in minutes', formatAwayTime(45 * MIN) === '45 min')
  check('away time on the hour drops the minutes', formatAwayTime(60 * MIN) === '1 h')
  check('very short away time has its own wording', formatAwayTime(10 * 1000) === 'less than a minute')

  check('the evening nudge waits for its set time', !isEndOfDay(new Date(2026, 9, 21, 17, 59), '18:00') && isEndOfDay(new Date(2026, 9, 21, 18, 0), '18:00'))
  check('the evening nudge defaults to 22:00', DEFAULT_SETTINGS.notifications.endOfDayTime === '22:00')
  check('the default evening nudge stays quiet before 22:00', !isEndOfDay(new Date(2026, 9, 21, 21, 59), DEFAULT_SETTINGS.notifications.endOfDayTime) && isEndOfDay(new Date(2026, 9, 21, 22, 0), DEFAULT_SETTINGS.notifications.endOfDayTime))
  check('a later evening nudge time is honoured', !isEndOfDay(new Date(2026, 9, 21, 19, 0), '23:30') && isEndOfDay(new Date(2026, 9, 21, 23, 30), '23:30'))
  check('the nudge counts its blocks in words', plannedNudgeLabel(1).startsWith('1 planned block') && plannedNudgeLabel(3).startsWith('3 planned blocks'))

  const now = localAt(2026, 10, 21, 10, 0)
  const blocks = {
    past: { templateId: 'past', title: 'Past', date: '2026-10-20', startTime: '09:00', endTime: '10:00' },
    endsNow: { templateId: 'endsNow', title: 'Ends now', date: '2026-10-21', startTime: '09:00', endTime: '10:00' },
    later: { templateId: 'later', title: 'Later', date: '2026-10-21', startTime: '10:30', endTime: '11:00' },
    noEnd: { templateId: 'noEnd', title: 'No end', date: '2026-10-20', startTime: '13:00' },
    overlapped: { templateId: 'overlapped', title: 'Overlapped', date: '2026-10-20', startTime: '14:00', endTime: '15:00' },
    touching: { templateId: 'touching', title: 'Touching', date: '2026-10-20', startTime: '16:00', endTime: '17:00' },
  }
  const logged = [
    entryAt('x', localAt(2026, 10, 20, 14, 30), localAt(2026, 10, 20, 15, 30), 'other'),
    entryAt('y', localAt(2026, 10, 20, 15, 0), localAt(2026, 10, 20, 16, 0)),
  ]
  check('a finished block with nothing over it is loggable', blockLogState(blocks.past, [], now) === 'loggable')
  check('a block that ends right now is loggable', blockLogState(blocks.endsNow, [], now) === 'loggable')
  check('a block that has not ended yet is not loggable', blockLogState(blocks.later, [], now) === 'not-finished')
  check('a block without an end time is not loggable', blockLogState(blocks.noEnd, [], now) === 'no-end')
  check('a block with time already over it is not loggable', blockLogState(blocks.overlapped, logged, now) === 'logged')
  check('an entry that only touches a block does not block it', blockLogState(blocks.touching, [logged[1]], now) === 'loggable')
  check('any overlapping entry counts, whatever task it belongs to', blockLogState(blocks.overlapped, [logged[0]], now) === 'logged')

  const loggable = loggableBlocks(Object.values(blocks) as PlannedBlock[], logged, now).map((block) => block.templateId)
  check('the blocks that qualify are the finished, unlogged ones', same(loggable, ['past', 'endsNow', 'touching']), loggable)

  const planned = planBlockEntry(blocks.past as PlannedBlock, [], now)
  check(
    'a planned block is logged exactly to its times, against its task',
    planned.ok &&
      planned.payload.startedAt === new Date(localAt(2026, 10, 20, 9, 0)).toISOString() &&
      planned.payload.endedAt === new Date(localAt(2026, 10, 20, 10, 0)).toISOString() &&
      planned.payload.taskId === 'past',
  )
  check('an overlapping block is refused, not written over', !planBlockEntry(blocks.overlapped as PlannedBlock, logged, now).ok)
  check('a block that has not ended is refused', !planBlockEntry(blocks.later as PlannedBlock, [], now).ok)

  const tasks = [
    blockTask('t1', '2026-10-21', '09:00', '10:00'),
    blockTask('t2', '2026-10-21', '09:30', '10:30'),
    blockTask('done', '2026-10-21', '09:10', '09:40', 'done'),
    blockTask('later', '2026-10-21', '10:30', '11:00'),
  ]
  const today = '2026-10-21'
  const none = (): boolean => false
  check(
    'a block started less than five minutes ago is not prompted',
    pickPlannedStart(tasks, today, localAt(2026, 10, 21, 9, 4), [], none) === null,
  )
  check(
    'a due block is prompted once five minutes have passed',
    pickPlannedStart(tasks, today, localAt(2026, 10, 21, 9, 5), [], none)?.templateId === 't1',
  )
  check(
    'the most recently started due block is the one prompted',
    pickPlannedStart(tasks, today, localAt(2026, 10, 21, 10, 0), [], none)?.templateId === 't2',
  )
  check(
    'a done block is never prompted',
    pickPlannedStart(tasks.filter((task) => task.templateId !== 't2'), today, localAt(2026, 10, 21, 9, 45), [], (task) => task.templateId === 't1') === null,
  )
  check(
    'a dismissed block is skipped',
    pickPlannedStart(tasks, today, localAt(2026, 10, 21, 9, 20), [], (task) => task.templateId === 't1') === null,
  )
  check(
    'a block already tracked since it began is not prompted',
    pickPlannedStart(tasks, today, localAt(2026, 10, 21, 9, 20), [entryAt('q', localAt(2026, 10, 21, 9, 6), localAt(2026, 10, 21, 9, 15), 't1')], none) === null,
  )
}

export function verifyTimerHistoryLabels() {
  section('Timer history: entry durations and day headings')

  const MINUTE = 60 * 1000
  check('formatEntryDuration: under a minute reads <1 m, not seconds', formatEntryDuration(45 * 1000) === '<1 m')
  check('formatEntryDuration: one millisecond still reads <1 m', formatEntryDuration(1) === '<1 m')
  check('formatEntryDuration: nothing recorded reads 0 m', formatEntryDuration(0) === '0 m')
  check('formatEntryDuration: a minute and up uses the hours and minutes total', formatEntryDuration(MINUTE) === '1 m')
  check('formatEntryDuration: 2 h 5 m', formatEntryDuration(125 * MINUTE) === '2 h 5 m')

  // Local-time dates, as the history groups them.
  check('formatDayHeading: weekday, day and month in English', formatDayHeading(new Date(2026, 9, 25), 'en-GB') === 'Sunday, 25 October')
  check('formatDayHeading: a single-digit day has no leading zero', formatDayHeading(new Date(2026, 8, 3), 'en-GB') === 'Thursday, 3 September')
}

/**
 * The Edge Function's reminder rules (supabase/functions/push-reminders/rules.ts)
 * must agree with the in-app rules on every case that matters, and the
 * messages must carry the same tags so one replaces the other.
 */
export function verifyPushReminderParity() {
  section('Web Push reminders: the server rules agree with the in-app rules')

  const hours = [0, 1, 3, 8]
  const runs = [0, 3 * HOUR - 1, 3 * HOUR, 9 * HOUR]
  const longRunAgrees = hours.every((h) =>
    runs.every((ms) => isLongRunDue(ms, h) === serverIsLongRunDue(ms, h)),
  )
  check('long-run: the server and the app agree at every threshold', longRunAgrees)

  const sitting = 'sit-p'
  const sittingEntries = [
    entryAt(sitting, localAt(2026, 10, 21, 8, 0), localAt(2026, 10, 21, 9, 0)),
    entryAt(sitting, localAt(2026, 10, 21, 9, 30), localAt(2026, 10, 21, 10, 0)),
    entryAt('sit-other', localAt(2026, 10, 21, 6, 0), localAt(2026, 10, 21, 11, 0)),
  ]
  check(
    'long-run: the server counts a sitting the same way',
    serverSittingRunningMs(sittingEntries, sitting, 10 * MIN) === sittingRunningMs(sittingEntries, sitting, 10 * MIN),
  )

  const nudgeCases: Array<[number, number, string]> = [
    [17, 59, '18:00'], [18, 0, '18:00'], [21, 59, '22:00'], [22, 0, '22:00'], [23, 30, '23:30'], [19, 0, '23:30'],
  ]
  check(
    'end of day: the server fires at the same minute as the app',
    nudgeCases.every(([h, m, time]) =>
      isEndOfDay(new Date(2026, 9, 21, h, m), time) === isEndOfDayMinutes(h * 60 + m, time),
    ),
  )

  const quietCases: Array<[number, number]> = [[21, 59], [22, 0], [3, 0], [7, 59], [8, 0], [12, 0]]
  check(
    'quiet hours: a window that crosses midnight is judged the same way',
    quietCases.every(([h, m]) =>
      isWithinQuietHours(new Date(2026, 9, 21, h, m), '22:00', '08:00') ===
      isWithinQuietMinutes(h * 60 + m, '22:00', '08:00'),
    ),
  )
  check(
    'quiet hours: an empty window (start equals end) is silent on both sides',
    !isWithinQuietHours(new Date(2026, 9, 21, 9, 0), '09:00', '09:00') &&
      !isWithinQuietMinutes(9 * 60, '09:00', '09:00'),
  )

  const day = '2026-10-21'
  const now = localAt(2026, 10, 21, 10, 0)
  const clock: Clock = {
    now,
    today: day,
    minutesOfDay: 10 * 60,
    localMs,
  }
  const planTasks = [
    blockTask('t1', day, '09:00', '10:00'),
    blockTask('t2', day, '09:30', '10:30'),
    blockTask('done', day, '09:10', '09:40', 'done'),
    blockTask('later', day, '10:30', '11:00'),
  ]
  const planEntries = [entryAt('q', localAt(2026, 10, 21, 9, 6), localAt(2026, 10, 21, 9, 15), 't1')]
  const none = (): boolean => false

  const pickClient = pickPlannedStart(planTasks, day, now, planEntries, none)
  const pickServer = serverPickPlannedStart(planTasks as unknown as ServerTask[], day, now, planEntries, localMs, none)
  check(
    'planned start: the same block is picked (most recent due, not done, not tracked)',
    pickClient?.templateId === 't2' && pickServer?.templateId === 't2',
    { client: pickClient?.templateId, server: pickServer?.templateId },
  )
  check(
    'planned start: the grace period matches the app',
    SERVER_PLANNED_START_GRACE_MS === 5 * MIN,
  )

  const endBlocks = planTasks.map((task) => ({
    templateId: task.templateId,
    title: task.title,
    date: task.date,
    startTime: task.startTime,
    endTime: task.endTime,
  })) as PlannedBlock[]
  const clientLoggable = loggableBlocks(endBlocks, sittingEntries, now).length
  const serverLoggable = loggableCount(endBlocks, sittingEntries, now, localMs)
  check('end of day: the same blocks count as unlogged', clientLoggable === serverLoggable, { clientLoggable, serverLoggable })
  check(
    'end of day: the nudge wording is shared',
    serverPlannedNudgeLabel(1) === plannedNudgeLabel(1) && serverPlannedNudgeLabel(3) === plannedNudgeLabel(3),
  )

  // Message tags and dedupe keys, through the full decision.
  const runningTimer: ServerTimer = {
    sessionId: 'sit-x',
    status: 'running',
    startedAt: localAt(2026, 10, 21, 5, 0),
    task: { taskId: 't1', taskTitle: 'Deep work' },
  }
  const longRun = decideReminders({
    clock: { ...clock, now: localAt(2026, 10, 21, 8, 30) },
    settings: null,
    timer: runningTimer,
    entries: [],
    tasks: [],
    wasSent: () => false,
  })
  check(
    'a long run pushes once, tagged like the in-app browser notification',
    longRun.length === 1 &&
      longRun[0].kind === 'long-run' &&
      longRun[0].tag === 'long-sit-x' &&
      longRun[0].ref === 'sit-x:3' &&
      longRun[0].body === 'Timer on "Deep work" has been running for 3 h',
    longRun,
  )
  const longRunSent = decideReminders({
    clock: { ...clock, now: localAt(2026, 10, 21, 8, 30) },
    settings: null,
    timer: runningTimer,
    entries: [],
    tasks: [],
    wasSent: (kind, ref) => kind === 'long-run' && ref === 'sit-x:3',
  })
  check('a long run already pushed is not pushed again', longRunSent.length === 0)

  const plannedDue = decideReminders({
    clock: { ...clock, now: localAt(2026, 10, 21, 9, 10), minutesOfDay: 9 * 60 + 10 },
    settings: null,
    timer: null,
    entries: [],
    tasks: [planTasks[0]] as unknown as ServerTask[],
    wasSent: () => false,
  })
  check(
    'planned start pushes a block started 5+ minutes ago with nothing running, tagged like the app',
    plannedDue.length === 1 &&
      plannedDue[0].kind === 'planned-start' &&
      plannedDue[0].tag === `planned-${planTasks[0].id}` &&
      plannedDue[0].ref === planTasks[0].id &&
      plannedDue[0].body === '"Block t1" started 10 min ago',
    plannedDue,
  )
  const plannedWhileRunning = decideReminders({
    clock: { ...clock, now: localAt(2026, 10, 21, 9, 10), minutesOfDay: 9 * 60 + 10 },
    settings: null,
    timer: { ...runningTimer, startedAt: localAt(2026, 10, 21, 9, 0) },
    entries: [],
    tasks: [planTasks[0]] as unknown as ServerTask[],
    wasSent: () => false,
  })
  check(
    'planned start is held back while a timer is running',
    !plannedWhileRunning.some((message) => message.kind === 'planned-start'),
  )
  const plannedSent = decideReminders({
    clock: { ...clock, now: localAt(2026, 10, 21, 9, 10), minutesOfDay: 9 * 60 + 10 },
    settings: null,
    timer: null,
    entries: [],
    tasks: [planTasks[0]] as unknown as ServerTask[],
    wasSent: (kind, ref) => kind === 'planned-start' && ref === planTasks[0].id,
  })
  check('planned start is sent once per block', plannedSent.length === 0)

  // The block is also due for a planned-start push; these cases are about the nudge.
  const plannedAlreadySent = (kind: string): boolean => kind === 'planned-start'
  const nudgeClock = { ...clock, now: localAt(2026, 10, 21, 22, 0), minutesOfDay: 22 * 60 }
  const nudgeTasks = [blockTask('n1', day, '09:00', '10:00')] as unknown as ServerTask[]
  const nudge = decideReminders({
    clock: nudgeClock,
    settings: null,
    timer: null,
    entries: [],
    tasks: nudgeTasks,
    wasSent: plannedAlreadySent,
  })
  check(
    'end of day pushes at 22:00 by default when a finished block has no time',
    nudge.length === 1 && nudge[0].kind === 'end-of-day' && nudge[0].body === plannedNudgeLabel(1) && nudge[0].ref === day,
    nudge,
  )
  check(
    'end of day stays quiet before its time',
    decideReminders({
      clock: { ...nudgeClock, minutesOfDay: 21 * 60 + 59 },
      settings: null,
      timer: null,
      entries: [],
      tasks: nudgeTasks,
      wasSent: plannedAlreadySent,
    }).length === 0,
  )
  check(
    'end of day is sent once a day',
    decideReminders({
      clock: nudgeClock,
      settings: null,
      timer: null,
      entries: [],
      tasks: nudgeTasks,
      wasSent: (kind, ref) => plannedAlreadySent(kind) || (kind === 'end-of-day' && ref === day),
    }).length === 0,
  )

  const quiet = decideReminders({
    clock: { ...nudgeClock, minutesOfDay: 23 * 60 },
    settings: { notifications: { quietHours: true, quietFrom: '22:00', quietTo: '08:00' } },
    timer: { ...runningTimer, startedAt: localAt(2026, 10, 20, 1, 0) },
    entries: [],
    tasks: nudgeTasks,
    wasSent: () => false,
  })
  check('quiet hours silence every server push', quiet.length === 0, quiet)

  const longRunOff = decideReminders({
    clock: { ...clock, now: localAt(2026, 10, 21, 12, 0), minutesOfDay: 12 * 60 },
    settings: { timer: { longRunHours: 0 } },
    timer: runningTimer,
    entries: [],
    tasks: [],
    wasSent: () => false,
  })
  check('a long run never pushes when switched off', longRunOff.length === 0)
}
