import { computed, ref, watch } from 'vue'
import type { ID, ISODate } from '../entities/types'
import type {
  TimeEntry,
  TimeEntryDraft,
  TimerTaskRef,
} from '../entities/TimerEntity'
import { TIMER_MODE, TIME_ENTRY_SOURCE } from '../entities/constants'
import { createId, getTodayISODate } from './goalSpace/date'
import { loadJson } from './goalSpace/storage'
import { useTombstones } from './useTombstones'
import { SYNC_TABLE, type SyncedRow } from '../sync/types'
import {
  entryFromDraft,
  groupByDay,
  sortByStart,
  totalForDay,
  totalForGoal,
  totalForTask,
  totalForTaskOnDate,
  totalForTasks,
} from './timer/entries'

export const TIME_ENTRIES_STORAGE_KEY = 'dayforge-time-entries-v1'

const entries = ref<TimeEntry[]>([])
let initialized = false

/** Stored history is user-editable JSON, so unusable rows are dropped. */
function sanitize(input: unknown): TimeEntry[] {
  if (!Array.isArray(input)) return []

  return input.filter((item): item is TimeEntry => {
    if (typeof item !== 'object' || item === null) return false
    const entry = item as Partial<TimeEntry>
    return (
      typeof entry.id === 'string' &&
      typeof entry.startedAt === 'string' &&
      typeof entry.endedAt === 'string' &&
      !Number.isNaN(Date.parse(entry.startedAt)) &&
      !Number.isNaN(Date.parse(entry.endedAt))
    )
  })
}

function persist() {
  localStorage.setItem(
    TIME_ENTRIES_STORAGE_KEY,
    JSON.stringify(entries.value),
  )
}

function initialize() {
  if (initialized) return
  initialized = true

  // Unusable rows are dropped outright; a row that is merely buried is taken
  // out of the list *and* its burial recorded, so the deletion still travels.
  entries.value = useTombstones().keepLive(
    SYNC_TABLE.TIME_ENTRIES,
    sanitize(loadJson<unknown>(TIME_ENTRIES_STORAGE_KEY, [])),
  )

  watch(entries, persist, { deep: true })

  // Another tab may have recorded a stretch of its own.
  window.addEventListener('storage', (event) => {
    if (event.key !== TIME_ENTRIES_STORAGE_KEY) return
    try {
      entries.value = useTombstones().keepLive(
        SYNC_TABLE.TIME_ENTRIES,
        sanitize(JSON.parse(event.newValue ?? '[]')),
      )
    } catch {
      // Leave the in-memory history alone if the other tab wrote junk.
    }
  })
}

export function useTimeEntries() {
  initialize()

  function addDrafts(drafts: TimeEntryDraft[]) {
    if (drafts.length === 0) return
    entries.value = [
      ...entries.value,
      ...drafts.map((draft) => entryFromDraft(draft, createId('entry'))),
    ]
  }

  function addManual(entry: {
    startedAt: string
    endedAt: string
    taskId?: ID
    goalId?: ID
    taskTitle?: string
    note?: string
  }): TimeEntry {
    const created: TimeEntry = {
      id: createId('entry'),
      sessionId: createId('session'),
      startedAt: entry.startedAt,
      endedAt: entry.endedAt,
      mode: TIMER_MODE.STOPWATCH,
      taskId: entry.taskId,
      goalId: entry.goalId,
      taskTitle: entry.taskTitle,
      note: entry.note,
      source: TIME_ENTRY_SOURCE.MANUAL,
      updatedAt: new Date().toISOString(),
    }

    entries.value = [...entries.value, created]
    return created
  }

  /** Labels a whole sitting at once, pauses included. */
  function assignSessionToTask(sessionId: ID, task: TimerTaskRef) {
    entries.value = entries.value.map((entry) =>
      entry.sessionId === sessionId
        ? {
            ...entry,
            taskId: task.taskId,
            goalId: task.goalId,
            taskTitle: task.taskTitle,
            updatedAt: new Date().toISOString(),
          }
        : entry,
    )
  }

  function updateEntry(id: ID, patch: Partial<Omit<TimeEntry, 'id'>>) {
    entries.value = entries.value.map((entry) =>
      entry.id === id
        ? { ...entry, ...patch, updatedAt: new Date().toISOString() }
        : entry,
    )
  }

  /**
   * Buried with a copy: history is the one thing that cannot be rebuilt, so a
   * deletion has to be both undoable and visible to the other devices.
   */
  function removeEntry(id: ID) {
    const entry = entries.value.find((item) => item.id === id)
    if (!entry) return

    useTombstones().bury(SYNC_TABLE.TIME_ENTRIES, [
      entry as unknown as SyncedRow,
    ])
    entries.value = entries.value.filter((item) => item.id !== id)
  }

  function restoreEntry(id: ID): TimeEntry | null {
    const row = useTombstones().exhume(SYNC_TABLE.TIME_ENTRIES, id)
    if (!row) return null

    const entry = row as unknown as TimeEntry
    entries.value = [...entries.value, entry]
    return entry
  }

  const days = computed(() => groupByDay(entries.value))
  const recent = computed(() => sortByStart(entries.value))
  const todayTotalMs = computed(() =>
    totalForDay(entries.value, getTodayISODate()),
  )

  return {
    entries,
    days,
    recent,
    todayTotalMs,
    addDrafts,
    addManual,
    assignSessionToTask,
    updateEntry,
    removeEntry,
    restoreEntry,
    totalForTask: (taskId: ID) => totalForTask(entries.value, taskId),
    totalForTasks: (taskIds: ID[]) => totalForTasks(entries.value, taskIds),
    totalForTaskToday: (taskId: ID) =>
      totalForTaskOnDate(entries.value, taskId, getTodayISODate()),
    totalForGoal: (goalId: ID) => totalForGoal(entries.value, goalId),
    totalForDate: (date: ISODate) => totalForDay(entries.value, date),
  }
}
