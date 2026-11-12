import type { useGoalSpace } from '../../composables/useGoalSpace'
import type { useSync } from '../../composables/useSync'
import type { useTimeEntries } from '../../composables/useTimeEntries'
import type { Goal } from '../../entities/GoalEntity'
import type { DailyTask, TaskTemplate } from '../../entities/TaskEntity'
import type { TimeEntry } from '../../entities/TimerEntity'
import { SYNC_TABLE, type SyncedRow } from '../../sync/types'

type SyncApi = ReturnType<typeof useSync>

/** Hands the four synced arrays to the engine. Call once the stored data is loaded. */
export function registerWorkspaceSync(
  sync: SyncApi,
  goalSpace: ReturnType<typeof useGoalSpace>,
  timeEntries: ReturnType<typeof useTimeEntries>,
  buildBackup: Parameters<SyncApi['register']>[1],
) {
  // Registering the arrays is the whole of it: from here the engine watches
  // them, queues what actually changed and sends it when it can.
  sync.register(
    [
      {
        table: SYNC_TABLE.GOALS,
        track: () => goalSpace.goals.value,
        read: () => goalSpace.goals.value as unknown as SyncedRow[],
        write: (rows) => goalSpace.setGoals(rows as unknown as Goal[]),
      },
      {
        table: SYNC_TABLE.TASK_TEMPLATES,
        track: () => goalSpace.taskTemplates.value,
        read: () => goalSpace.taskTemplates.value as unknown as SyncedRow[],
        write: (rows) => {
          goalSpace.taskTemplates.value = rows as unknown as TaskTemplate[]
        },
      },
      {
        table: SYNC_TABLE.DAILY_TASKS,
        track: () => goalSpace.dailyTasks.value,
        read: () => goalSpace.dailyTasks.value as unknown as SyncedRow[],
        write: (rows) => {
          goalSpace.dailyTasks.value = rows as unknown as DailyTask[]
        },
      },
      {
        table: SYNC_TABLE.TIME_ENTRIES,
        track: () => timeEntries.entries.value,
        read: () => timeEntries.entries.value as unknown as SyncedRow[],
        write: (rows) => {
          timeEntries.entries.value = rows as unknown as TimeEntry[]
        },
      },
    ],
    buildBackup,
  )
}
