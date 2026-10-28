import { computed } from 'vue'
import { i18n } from '../../../i18n'
import type { useGoalSpace } from '../../../composables/useGoalSpace'
import type { TimeEntry } from '../../../entities/TimerEntity'
import { useUndoToast } from '../../../composables/useUndoToast'
import {
  TIME_ENTRIES_STORAGE_KEY,
  useTimeEntries,
} from '../../../composables/useTimeEntries'
import { TOMBSTONES_STORAGE_KEY } from '../../../composables/useTombstones'
import { restampForRestore } from '../../../sync/tombstoneRules'
import type { SyncedRow } from '../../../sync/types'
import { getTodayISODate } from '../../../composables/goalSpace/date'
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  parseBackupFile,
  type BackupFile,
} from './backupFormat'

export { parseBackupFile, type BackupFile } from './backupFormat'

/**
 * Rows coming out of a file or a snapshot are stamped as a current edit. With an
 * account attached, their original stamps could easily be older than what the
 * server holds, and the restore would be quietly undone by the next sync.
 */
function restampAll<T>(rows: T[]): T[] {
  return rows.map(
    (row) => restampForRestore(row as unknown as SyncedRow) as unknown as T,
  )
}

const THEME_STORAGE_KEY = 'dayforge-theme-v1'
const SETTINGS_STORAGE_KEY = 'dayforge-settings-v1'

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : undefined
  } catch {
    return undefined
  }
}

export function useDataTransfer(goalSpace: ReturnType<typeof useGoalSpace>) {
  const { offerUndo } = useUndoToast()
  const { entries: timeEntries, heldEntries } = useTimeEntries()

  const stats = computed(() => {
    const bytes = [
      'dayforge-goals',
      'dayforge-task-templates',
      'dayforge-daily-tasks',
      TIME_ENTRIES_STORAGE_KEY,
      THEME_STORAGE_KEY,
      SETTINGS_STORAGE_KEY,
      TOMBSTONES_STORAGE_KEY,
    ].reduce(
      (total, key) => total + (localStorage.getItem(key)?.length ?? 0),
      0,
    )

    return {
      goals: goalSpace.goals.value.length,
      templates: goalSpace.taskTemplates.value.length,
      rows: goalSpace.dailyTasks.value.length,
      // Roughly: localStorage stores UTF-16, so a character is ~2 bytes.
      kilobytes: Math.round((bytes * 2) / 1024),
    }
  })

  function buildBackup(): BackupFile {
    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      newerVersion: false,
      exportedAt: new Date().toISOString(),
      goals: goalSpace.goals.value,
      taskTemplates: goalSpace.taskTemplates.value,
      dailyTasks: goalSpace.dailyTasks.value,
      timeEntries: [
        ...timeEntries.value,
        ...heldEntries(),
      ] as unknown as TimeEntry[],
      theme: readJson(THEME_STORAGE_KEY),
      settings: readJson(SETTINGS_STORAGE_KEY),
    }
  }

  /** Snapshot of everything replaceable, for the undo offers below. */
  function snapshot() {
    const goals = [...goalSpace.goals.value]
    const templates = [...goalSpace.taskTemplates.value]
    const rows = [...goalSpace.dailyTasks.value]
    const entries = [...timeEntries.value]
    const activeGoalId = goalSpace.activeGoalId.value

    return () => {
      goalSpace.setGoals(restampAll(goals))
      goalSpace.taskTemplates.value = restampAll(templates)
      goalSpace.dailyTasks.value = restampAll(rows)
      timeEntries.value = restampAll(entries)
      goalSpace.selectGoal(activeGoalId)
    }
  }

  function exportToFile() {
    const blob = new Blob([JSON.stringify(buildBackup(), null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `dayforge-${getTodayISODate()}.json`
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  /** Returns false when the file wasn't a DayForge backup. */
  function importBackup(input: unknown): boolean {
    const backup = parseBackupFile(input)
    if (!backup) return false

    const restore = snapshot()

    goalSpace.setGoals(restampAll(backup.goals))
    goalSpace.taskTemplates.value = restampAll(backup.taskTemplates)
    goalSpace.dailyTasks.value = restampAll(backup.dailyTasks)
    timeEntries.value = restampAll(backup.timeEntries ?? [])
    goalSpace.selectGoal(backup.goals[0]?.id ?? null)

    if (backup.theme !== undefined) {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(backup.theme))
    }
    if (backup.settings !== undefined) {
      localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(backup.settings),
      )
    }

    offerUndo(i18n.global.t('settings.undoBackupImported'), restore)
    return true
  }

  function clearEverything() {
    const restore = snapshot()

    goalSpace.setGoals([])
    goalSpace.taskTemplates.value = []
    goalSpace.dailyTasks.value = []
    timeEntries.value = []
    goalSpace.selectGoal(null)

    offerUndo(i18n.global.t('settings.undoAllCleared'), restore)
  }

  /**
   * Puts back one of the snapshots taken automatically before a first merge.
   * It goes through the same path as a file, undo offer included.
   */
  function restoreSnapshot(payload: unknown): boolean {
    return importBackup(payload)
  }

  return {
    stats,
    buildBackup,
    exportToFile,
    importBackup,
    restoreSnapshot,
    clearEverything,
  }
}
