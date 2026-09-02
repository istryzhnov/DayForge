import { computed, reactive } from 'vue'
import type { TimeEntry } from '../../../entities/TimerEntity'
import { useTimeEntries } from '../../../composables/useTimeEntries'
import { validateEntry } from '../../../composables/timer/entries'
import {
  fromDateTimeInput,
  toDateTimeInput,
} from '../../../composables/timer/format'

const HOUR_MS = 60 * 60 * 1000

/** Drives one open editor; the modal mounts fresh for every entry. */
export function useTimeEntryEditor(entry: TimeEntry | null) {
  const { entries, addManual, updateEntry } = useTimeEntries()

  const now = Date.now()

  const form = reactive({
    startedAt: toDateTimeInput(
      entry?.startedAt ?? new Date(now - HOUR_MS).toISOString(),
    ),
    endedAt: toDateTimeInput(entry?.endedAt ?? new Date(now).toISOString()),
    taskTitle: entry?.taskTitle ?? '',
    note: entry?.note ?? '',
  })

  const issues = computed(() =>
    validateEntry(
      {
        id: entry?.id ?? '',
        startedAt: fromDateTimeInput(form.startedAt),
        endedAt: fromDateTimeInput(form.endedAt),
      },
      entries.value,
      Date.now(),
    ),
  )

  const canSave = computed(() => issues.value.errors.length === 0)

  /** Returns false when the form still has blocking errors. */
  function save(): boolean {
    if (!canSave.value) return false

    const payload = {
      startedAt: fromDateTimeInput(form.startedAt),
      endedAt: fromDateTimeInput(form.endedAt),
      taskTitle: form.taskTitle.trim() || undefined,
      note: form.note.trim() || undefined,
    }

    if (entry) {
      updateEntry(entry.id, payload)
    } else {
      addManual(payload)
    }

    return true
  }

  return { form, issues, canSave, save }
}
