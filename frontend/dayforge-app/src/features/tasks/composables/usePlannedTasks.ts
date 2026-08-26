import { computed } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { DailyTask, TaskTemplate } from '../../../entities/TaskEntity'
import type { ID, ISODate } from '../../../entities/types'
import { TASK_STATUS } from '../../../entities/constants'
import { getTodayISODate } from '../../../composables/goalSpace/date'
import {
  isAnnual,
  nextPlannedDateOf,
} from '../../../composables/goalSpace/recurrence'

export type PlannedTask = {
  templateId: ID
  dailyTaskId: ID | null
  title: string
  date: ISODate
  goalTitle: string
  startTime?: string
  isDone: boolean
  isOverdue: boolean
  isToday: boolean
  isAnnual: boolean
}

type PlannedOptions = {
  getTemplates: () => TaskTemplate[]
  getDailyTasks: () => DailyTask[]
  getGoals: () => Goal[]
}

export function usePlannedTasks(options: PlannedOptions) {
  const plannedTasks = computed<PlannedTask[]>(() => {
    const today = getTodayISODate()
    const goalTitleById = new Map(
      options.getGoals().map((goal) => [goal.id, goal.title]),
    )
    const dailyTasks = options.getDailyTasks()

    return options
      .getTemplates()
      .flatMap((template) => {
        const date = nextPlannedDateOf(template, today)
        if (!date) return []

        const row = dailyTasks.find(
          (item) => item.templateId === template.id && item.date === date,
        )
        const isDone = row?.status === TASK_STATUS.DONE

        if (isDone && date !== today) return []

        return [
          {
            templateId: template.id,
            dailyTaskId: row?.id ?? null,
            title: template.title,
            date,
            goalTitle: template.goalId
              ? (goalTitleById.get(template.goalId) ?? 'Unknown Goal')
              : 'No goal',
            startTime: template.startTime,
            isDone,
            // An annual date is never overdue — it simply comes round again.
            isOverdue: !isDone && !isAnnual(template) && date < today,
            isToday: date === today,
            isAnnual: isAnnual(template),
          },
        ]
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  })

  const plannedCount = computed(() => plannedTasks.value.length)

  return { plannedTasks, plannedCount }
}
