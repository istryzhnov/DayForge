import { computed } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { DailyTask, TaskTemplate } from '../../../entities/TaskEntity'
import type { ID, ISODate } from '../../../entities/types'
import { i18n } from '../../../i18n'
import {
  RECURRENCE_TYPE,
  TASK_KIND_BY_SCHEDULE,
  TASK_STATUS,
} from '../../../entities/constants'
import { getTodayISODate } from '../../../composables/goalSpace/date'
import { recurrenceWords } from '../../../composables/goalSpace/recurrenceWords'
import { projectColors } from '../../../composables/theme/goalTheme'
import {
  describeRecurrence,
  isAnnual,
  nextPlannedDateOf,
  scheduleKindOf,
} from '../../../composables/goalSpace/recurrence'

export type PlannedTask = {
  templateId: ID
  dailyTaskId: ID | null
  title: string
  date: ISODate
  goalTitle: string
  /** The project's colour for the row's dot; absent when it has none. */
  goalColor?: string
  startTime?: string
  isDone: boolean
  isOverdue: boolean
  isToday: boolean
  isAnnual: boolean
  /** Set for a repeating task that has not started yet, e.g. "Every 8 days". */
  repeatLabel?: string
}

type PlannedOptions = {
  getTemplates: () => TaskTemplate[]
  getDailyTasks: () => DailyTask[]
  getGoals: () => Goal[]
}

/**
 * A repeating task is planned from its first day until that day arrives; after
 * that it lives in the daily list like any other repeat.
 */
function notYetStartedRepeatOf(
  template: TaskTemplate,
  today: ISODate,
): ISODate | null {
  const rule = template.recurrence
  if (!rule || rule.type === RECURRENCE_TYPE.NONE) return null
  if (scheduleKindOf(template) !== TASK_KIND_BY_SCHEDULE.RECURRING) return null
  return rule.startDate > today ? rule.startDate : null
}

export function usePlannedTasks(options: PlannedOptions) {
  const plannedTasks = computed<PlannedTask[]>(() => {
    const today = getTodayISODate()
    const goals = options.getGoals()
    const goalTitleById = new Map(goals.map((goal) => [goal.id, goal.title]))
    const goalColorById = projectColors(goals)
    const dailyTasks = options.getDailyTasks()

    return options
      .getTemplates()
      .flatMap((template) => {
        const plannedRepeat = notYetStartedRepeatOf(template, today)
        const date = plannedRepeat ?? nextPlannedDateOf(template, today)
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
              ? (goalTitleById.get(template.goalId) ??
                i18n.global.t('tasks.unknownGoal'))
              : i18n.global.t('tasks.noGoal'),
            goalColor: template.goalId
              ? goalColorById.get(template.goalId)
              : undefined,
            startTime: template.startTime,
            isDone,
            // An annual date is never overdue — it simply comes round again.
            isOverdue: !isDone && !isAnnual(template) && date < today,
            isToday: date === today,
            isAnnual: isAnnual(template),
            repeatLabel:
              plannedRepeat && template.recurrence
                ? describeRecurrence(template.recurrence, recurrenceWords())
                : undefined,
          },
        ]
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  })

  const plannedCount = computed(() => plannedTasks.value.length)

  return { plannedTasks, plannedCount }
}
