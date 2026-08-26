import { computed } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { DailyTask, TaskTemplate } from '../../../entities/TaskEntity'
import type { ID, ISODate } from '../../../entities/types'
import { TASK_STATUS } from '../../../entities/constants'

export type ArchivedTask = {
  id: ID
  title: string
  date: ISODate
  completedAt?: string
  goalTitle: string
  startTime?: string
}

/** One block per project, plus a catch-all for tasks that belong to none. */
export type ArchiveBlock = {
  key: string
  projectTitle: string
  goalTitle: string
  tasks: ArchivedTask[]
  latestDate: ISODate
}

type ArchiveOptions = {
  getTemplates: () => TaskTemplate[]
  getDailyTasks: () => DailyTask[]
  getGoals: () => Goal[]
}

const NO_PROJECT_KEY = '__no_project__'

export function useArchive(options: ArchiveOptions) {
  const blocks = computed<ArchiveBlock[]>(() => {
    const templates = options.getTemplates()
    const templateById = new Map(templates.map((item) => [item.id, item]))
    const goalTitleById = new Map(
      options.getGoals().map((goal) => [goal.id, goal.title]),
    )

    const done = options
      .getDailyTasks()
      .filter((row) => row.status === TASK_STATUS.DONE)

    const grouped = new Map<string, ArchiveBlock>()

    done.forEach((row) => {
      const template = templateById.get(row.templateId)
      const project = template?.parentTemplateId
        ? templateById.get(template.parentTemplateId)
        : undefined

      const key = project?.id ?? NO_PROJECT_KEY
      const goalTitle = row.goalId
        ? (goalTitleById.get(row.goalId) ?? 'Unknown goal')
        : 'No goal'

      const task: ArchivedTask = {
        id: row.id,
        title: row.title,
        date: row.date,
        completedAt: row.completedAt,
        goalTitle,
        startTime: row.startTime,
      }

      const existing = grouped.get(key)
      if (existing) {
        existing.tasks.push(task)
        if (row.date > existing.latestDate) existing.latestDate = row.date
        return
      }

      grouped.set(key, {
        key,
        projectTitle: project?.title ?? 'Without a project',
        goalTitle,
        tasks: [task],
        latestDate: row.date,
      })
    })

    return [...grouped.values()]
      .map((block) => ({
        ...block,
        // Newest first, matching the task list everywhere else.
        tasks: block.tasks.sort((a, b) => b.date.localeCompare(a.date)),
      }))
      .sort((a, b) => b.latestDate.localeCompare(a.latestDate))
  })

  const totalDone = computed(() =>
    blocks.value.reduce((sum, block) => sum + block.tasks.length, 0),
  )

  return { blocks, totalDone }
}
