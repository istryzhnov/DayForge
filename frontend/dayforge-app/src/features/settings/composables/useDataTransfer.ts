import { computed } from 'vue'
import type { useGoalSpace } from '../../../composables/useGoalSpace'
import type { Goal } from '../../../entities/GoalEntity'
import type { DailyTask, TaskTemplate } from '../../../entities/TaskEntity'
import { useUndoToast } from '../../../composables/useUndoToast'

/**
 * Moving the whole workspace in and out of a file.
 *
 * Import and "clear everything" write straight into the live refs rather than
 * rewriting `localStorage` and reloading: the storage watchers persist the new
 * arrays for us, and — more importantly — the previous contents stay in memory,
 * so both actions can be handed to `useUndoToast` like every other destructive
 * action in the app.
 *
 * Note for later: when `goalSpace/backup.ts` lands, the JSON shape below is the
 * only thing this file owns — swapping the reader/writer for `useBackup` is a
 * one-line change in each function.
 */

const BACKUP_FORMAT = 'dayforge-backup'
const BACKUP_VERSION = 1

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: string
  goals: Goal[]
  taskTemplates: TaskTemplate[]
  dailyTasks: DailyTask[]
  /** Theme and preferences travel along, so a restore looks like the original. */
  theme?: unknown
  settings?: unknown
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** A backup is a file off disk, so nothing in it is trusted before it is applied. */
export function parseBackupFile(input: unknown): BackupFile | null {
  if (!isRecord(input)) return null
  if (input.format !== BACKUP_FORMAT) return null
  if (!Array.isArray(input.goals)) return null
  if (!Array.isArray(input.taskTemplates)) return null
  if (!Array.isArray(input.dailyTasks)) return null

  return {
    format: BACKUP_FORMAT,
    version: typeof input.version === 'number' ? input.version : BACKUP_VERSION,
    exportedAt:
      typeof input.exportedAt === 'string'
        ? input.exportedAt
        : new Date().toISOString(),
    goals: input.goals as Goal[],
    taskTemplates: input.taskTemplates as TaskTemplate[],
    dailyTasks: input.dailyTasks as DailyTask[],
    theme: input.theme,
    settings: input.settings,
  }
}

export function useDataTransfer(goalSpace: ReturnType<typeof useGoalSpace>) {
  const { offerUndo } = useUndoToast()

  const stats = computed(() => {
    const bytes = [
      'dayforge-goals',
      'dayforge-task-templates',
      'dayforge-daily-tasks',
      THEME_STORAGE_KEY,
      SETTINGS_STORAGE_KEY,
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
      exportedAt: new Date().toISOString(),
      goals: goalSpace.goals.value,
      taskTemplates: goalSpace.taskTemplates.value,
      dailyTasks: goalSpace.dailyTasks.value,
      theme: readJson(THEME_STORAGE_KEY),
      settings: readJson(SETTINGS_STORAGE_KEY),
    }
  }

  /** Snapshot of everything replaceable, for the undo offers below. */
  function snapshot() {
    const goals = [...goalSpace.goals.value]
    const templates = [...goalSpace.taskTemplates.value]
    const rows = [...goalSpace.dailyTasks.value]
    const activeGoalId = goalSpace.activeGoalId.value

    return () => {
      goalSpace.setGoals(goals)
      goalSpace.taskTemplates.value = templates
      goalSpace.dailyTasks.value = rows
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
    link.download = `dayforge-${new Date().toISOString().slice(0, 10)}.json`
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

    goalSpace.setGoals(backup.goals)
    goalSpace.taskTemplates.value = backup.taskTemplates
    goalSpace.dailyTasks.value = backup.dailyTasks
    goalSpace.selectGoal(backup.goals[0]?.id ?? null)

    // The theme and preferences are owned by their own composables, which read
    // storage once on startup — so they are written back and picked up on the
    // next load rather than forced in here.
    if (backup.theme !== undefined) {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(backup.theme))
    }
    if (backup.settings !== undefined) {
      localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(backup.settings),
      )
    }

    offerUndo('Backup imported', restore)
    return true
  }

  function clearEverything() {
    const restore = snapshot()

    goalSpace.setGoals([])
    goalSpace.taskTemplates.value = []
    goalSpace.dailyTasks.value = []
    goalSpace.selectGoal(null)

    offerUndo('All data cleared', restore)
  }

  return { stats, exportToFile, importBackup, clearEverything }
}
