import { computed } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { DailyTask, TaskTemplate } from '../../../entities/TaskEntity'
import type { ID, ISODate, ISODateTime } from '../../../entities/types'
import { TASK_STATUS } from '../../../entities/constants'
import { i18n } from '../../../i18n'
import { projectColors } from '../../../composables/theme/goalTheme'
import { useSettings } from '../../../composables/useSettings'
import { doneCountsOf, groupByDay, type DayGroup } from './dayGroups'
import { useToday } from '../../../composables/goalSpace/today'

export type ArchivedTask = {
  id: ID
  title: string
  date: ISODate
  completedAt?: ISODateTime
  goalTitle: string
  /** The project's colour for the row's dot; absent when it has none. */
  goalColor?: string
  startTime?: string
}

type ArchiveOptions = {
  getTemplates: () => TaskTemplate[]
  getDailyTasks: () => DailyTask[]
  getGoals: () => Goal[]
}

export function useArchive(options: ArchiveOptions) {
  // The real day; it moves on at midnight while the view stays open.
  const today = useToday()
  const { settings } = useSettings()

  /** Newest day first, and within a day the latest completion first. */
  const days = computed<DayGroup<ArchivedTask>[]>(() => {
    const goals = options.getGoals()
    const goalTitleById = new Map(goals.map((goal) => [goal.id, goal.title]))
    const goalColorById = projectColors(goals)

    const done = options
      .getDailyTasks()
      .filter((row) => row.status === TASK_STATUS.DONE)
      .map((row): ArchivedTask => ({
        id: row.id,
        title: row.title,
        date: row.date,
        completedAt: row.completedAt,
        goalTitle: row.goalId
          ? (goalTitleById.get(row.goalId) ??
            i18n.global.t('tasks.unknownGoal'))
          : i18n.global.t('tasks.noGoal'),
        goalColor: row.goalId ? goalColorById.get(row.goalId) : undefined,
        startTime: row.startTime,
      }))
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          (b.completedAt ?? '').localeCompare(a.completedAt ?? ''),
      )

    return groupByDay(done)
  })

  const totalDone = computed(() =>
    days.value.reduce((sum, day) => sum + day.items.length, 0),
  )

  const counts = computed(() =>
    doneCountsOf(
      days.value.flatMap((day) => day.items.map((task) => task.date)),
      today.value,
      settings.calendar.weekStartsOn,
    ),
  )

  return {
    days,
    totalDone,
    doneThisWeek: computed(() => counts.value.thisWeek),
    doneThisMonth: computed(() => counts.value.thisMonth),
  }
}
