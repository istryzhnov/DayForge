import type { DailyTask } from '../../entities/TaskEntity'
import type { TimeEntry } from '../../entities/TimerEntity'
import type { ID, ISODate, TimeOfDay } from '../../entities/types'
import { TASK_STATUS } from '../../entities/constants'
import { findOverlaps, validateEntry } from './entries'
import { PLANNED_START_GRACE_MS } from './reminders'

/** A scheduled block: what the calendar shows for one task on one day. */
export interface PlannedBlock {
  templateId: ID
  goalId?: ID
  title: string
  date: ISODate
  startTime?: TimeOfDay
  endTime?: TimeOfDay
}

export interface BlockRange {
  startedAt: number
  endedAt: number
}

/** Epoch ms of a local `YYYY-MM-DD` day at `HH:mm`. */
export function localMs(date: ISODate, time: TimeOfDay): number {
  const [year, month, day] = date.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes).getTime()
}

export function blockFromTask(task: DailyTask): PlannedBlock {
  return {
    templateId: task.templateId,
    goalId: task.goalId,
    title: task.title,
    date: task.date,
    startTime: task.startTime,
    endTime: task.endTime,
  }
}

/** Null when the block lacks a start or an end, or ends before it starts. */
export function blockRange(block: PlannedBlock): BlockRange | null {
  if (!block.startTime || !block.endTime) return null
  const startedAt = localMs(block.date, block.startTime)
  const endedAt = localMs(block.date, block.endTime)
  return endedAt > startedAt ? { startedAt, endedAt } : null
}

/**
 * no-end: nothing to log against. not-finished: the block has not ended yet.
 * logged: some time entry already overlaps it. loggable: nothing stands in the way.
 */
export type BlockLogState = 'no-end' | 'not-finished' | 'logged' | 'loggable'

export function blockLogState(
  block: PlannedBlock,
  entries: TimeEntry[],
  now: number,
): BlockLogState {
  const range = blockRange(block)
  if (!range) return 'no-end'
  if (range.endedAt > now) return 'not-finished'

  const probe = {
    id: '',
    startedAt: new Date(range.startedAt).toISOString(),
    endedAt: new Date(range.endedAt).toISOString(),
  }
  return findOverlaps(probe, entries).length > 0 ? 'logged' : 'loggable'
}

export interface ManualEntryPayload {
  startedAt: string
  endedAt: string
  taskId: ID
  goalId?: ID
  taskTitle: string
}

export type PlanResult =
  | { ok: true; payload: ManualEntryPayload }
  | { ok: false; reason: string }

/** The entry that matches a block exactly, or the reason it cannot be written. */
export function planBlockEntry(
  block: PlannedBlock,
  entries: TimeEntry[],
  now: number,
): PlanResult {
  const state = blockLogState(block, entries, now)
  if (state === 'no-end') {
    return { ok: false, reason: 'This block has no end time.' }
  }
  if (state === 'not-finished') {
    return { ok: false, reason: 'This block has not ended yet.' }
  }

  const range = blockRange(block) as BlockRange
  const startedAt = new Date(range.startedAt).toISOString()
  const endedAt = new Date(range.endedAt).toISOString()

  const issues = validateEntry({ id: '', startedAt, endedAt }, entries, now)
  if (issues.errors.length > 0) return { ok: false, reason: issues.errors[0] }
  if (state === 'logged') {
    return { ok: false, reason: 'Time is already logged over this block.' }
  }

  return {
    ok: true,
    payload: {
      startedAt,
      endedAt,
      taskId: block.templateId,
      goalId: block.goalId,
      taskTitle: block.title,
    },
  }
}

export function loggableBlocks(
  blocks: PlannedBlock[],
  entries: TimeEntry[],
  now: number,
): PlannedBlock[] {
  return blocks.filter(
    (block) => blockLogState(block, entries, now) === 'loggable',
  )
}

/** Something was already recorded for this task after its block began. */
function trackedSince(
  entries: TimeEntry[],
  templateId: ID,
  sinceMs: number,
): boolean {
  return entries.some(
    (entry) =>
      entry.taskId === templateId && Date.parse(entry.endedAt) > sinceMs,
  )
}

/**
 * The most recently started block that is due for a "start the timer?" prompt:
 * started at least the grace period ago, not done, not skipped, and with no
 * time already tracked against it since it began.
 */
export function pickPlannedStart(
  tasks: DailyTask[],
  today: ISODate,
  now: number,
  entries: TimeEntry[],
  isSkipped: (task: DailyTask) => boolean,
): DailyTask | null {
  let best: { task: DailyTask; startMs: number } | null = null

  for (const task of tasks) {
    if (task.date !== today || !task.startTime) continue
    if (task.status === TASK_STATUS.DONE) continue

    const startMs = localMs(today, task.startTime)
    if (now - startMs < PLANNED_START_GRACE_MS) continue
    if (isSkipped(task)) continue
    if (trackedSince(entries, task.templateId, startMs)) continue

    if (!best || startMs > best.startMs) best = { task, startMs }
  }

  return best?.task ?? null
}
