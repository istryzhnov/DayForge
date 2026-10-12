import { computed, customRef, ref, watch } from 'vue'
import type { ID } from '../entities/types'
import type {
  TimeEntry,
  TimeEntryDraft,
  TimerTaskRef,
} from '../entities/TimerEntity'
import { TIMER_MODE, TIME_ENTRY_SOURCE } from '../entities/constants'
import { createId, getTodayISODate } from './goalSpace/date'
import { readJson, writeJson } from '../lib/storage'
import { useTombstones } from './useTombstones'
import { SYNC_TABLE, type SyncedRow } from '../sync/types'
import {
  entryFromDraft,
  groupByDay,
  sortByStart,
  splitReadableEntries,
  totalForDay,
  totalForTaskOnDate,
  totalForTasks,
} from './timer/entries'

export const TIME_ENTRIES_STORAGE_KEY = 'dayforge-time-entries-v1'

let unreadable: unknown[] = []

function holdUnreadable(more: unknown[]) {
  if (more.length === 0) return
  const seen = new Set(unreadable.map((item) => JSON.stringify(item)))
  more.forEach((item) => {
    const key = JSON.stringify(item)
    if (seen.has(key)) return
    seen.add(key)
    unreadable.push(item)
  })
}

const stored = ref<TimeEntry[]>([])

const entries = customRef<TimeEntry[]>((track, trigger) => ({
  get() {
    track()
    return stored.value
  },
  set(next) {
    const split = splitReadableEntries(next)
    const readableIds = new Set(split.readable.map((entry) => entry.id))
    unreadable = unreadable.filter(
      (item) =>
        typeof item !== 'object' ||
        item === null ||
        !readableIds.has((item as { id?: string }).id ?? ''),
    )
    holdUnreadable(split.unreadable)
    stored.value = split.readable
    trigger()
  },
}))

let initialized = false

function persist() {
  writeJson(TIME_ENTRIES_STORAGE_KEY, [...entries.value, ...unreadable])
}

function initialize() {
  if (initialized) return
  initialized = true

  const raw = readJson<unknown>(TIME_ENTRIES_STORAGE_KEY, [])
  const split = splitReadableEntries(Array.isArray(raw) ? raw : [])
  holdUnreadable(split.unreadable)

  entries.value = useTombstones().keepLive(
    SYNC_TABLE.TIME_ENTRIES,
    split.readable,
  )

  watch(entries, persist, { deep: true })

  // Another tab may have recorded a stretch of its own.
  window.addEventListener('storage', (event) => {
    if (event.key !== TIME_ENTRIES_STORAGE_KEY) return
    try {
      const parsed = JSON.parse(event.newValue ?? '[]')
      const incoming = splitReadableEntries(Array.isArray(parsed) ? parsed : [])
      holdUnreadable(incoming.unreadable)
      entries.value = useTombstones().keepLive(
        SYNC_TABLE.TIME_ENTRIES,
        incoming.readable,
      )
    } catch {
      // Leave the in-memory history alone if the other tab wrote junk.
    }
  })
}

export function useTimeEntries() {
  initialize()

  /**
   * The id comes from the stretch itself: two devices that both watch a
   * countdown run out record the same row, and sync folds them into one.
   */
  function addDrafts(drafts: TimeEntryDraft[]) {
    const known = new Set(entries.value.map((entry) => entry.id))
    const fresh = drafts
      .map((draft) => entryFromDraft(draft, `entry-${draft.sessionId}-${draft.startedAt}`))
      .filter((entry) => !known.has(entry.id))
    if (fresh.length === 0) return
    entries.value = [...entries.value, ...fresh]
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

  const days = computed(() => groupByDay(entries.value))
  const recent = computed(() => sortByStart(entries.value))
  const todayTotalMs = computed(() =>
    totalForDay(entries.value, getTodayISODate()),
  )

  return {
    entries,
    heldEntries: () => [...unreadable],
    days,
    recent,
    todayTotalMs,
    addDrafts,
    addManual,
    assignSessionToTask,
    updateEntry,
    removeEntry,
    totalForTasks: (taskIds: ID[]) => totalForTasks(entries.value, taskIds),
    totalForTaskToday: (taskId: ID) =>
      totalForTaskOnDate(entries.value, taskId, getTodayISODate()),
  }
}
