import type { Goal } from '../../../entities/GoalEntity'
import type { DailyTask, TaskTemplate } from '../../../entities/TaskEntity'
import type { TimeEntry } from '../../../entities/TimerEntity'

export const BACKUP_FORMAT = 'dayforge-backup'
export const BACKUP_VERSION = 1

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  version: number
  newerVersion: boolean
  exportedAt: string
  goals: Goal[]
  taskTemplates: TaskTemplate[]
  dailyTasks: DailyTask[]
  /** Absent in backups written before the timer existed. */
  timeEntries?: TimeEntry[]
  /** Theme and preferences travel along, so a restore looks like the original. */
  theme?: unknown
  settings?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** A deleted row has no business coming back out of a backup, nor does junk. */
function withoutDeleted<T extends { deletedAt?: string }>(
  rows: unknown[],
): T[] {
  return rows.filter(
    (row): row is T =>
      isRecord(row) &&
      typeof row.id === 'string' &&
      row.id !== '' &&
      row.deletedAt === undefined,
  )
}

/** A backup is a file off disk, so nothing in it is trusted before it is applied. */
export function parseBackupFile(input: unknown): BackupFile | null {
  if (!isRecord(input)) return null
  if (input.format !== BACKUP_FORMAT) return null
  if (!Array.isArray(input.goals)) return null
  if (!Array.isArray(input.taskTemplates)) return null
  if (!Array.isArray(input.dailyTasks)) return null

  const version =
    typeof input.version === 'number' ? input.version : BACKUP_VERSION

  return {
    format: BACKUP_FORMAT,
    version,
    newerVersion: version > BACKUP_VERSION,
    exportedAt:
      typeof input.exportedAt === 'string'
        ? input.exportedAt
        : new Date().toISOString(),
    goals: withoutDeleted<Goal>(input.goals),
    taskTemplates: withoutDeleted<TaskTemplate>(input.taskTemplates),
    dailyTasks: withoutDeleted<DailyTask>(input.dailyTasks),
    timeEntries: Array.isArray(input.timeEntries)
      ? withoutDeleted<TimeEntry>(input.timeEntries)
      : [],
    theme: input.theme,
    settings: input.settings,
  }
}
