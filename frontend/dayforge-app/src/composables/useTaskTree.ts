import { computed } from 'vue'
import type { Goal } from '../entities/GoalEntity'
import type { DailyTask, TaskTemplate } from '../entities/TaskEntity'
import type { ID } from '../entities/types'
import { PRIORITY, TASK_STATUS } from '../entities/constants'
import { isRepeating } from './goalSpace/recurrence'

export type TaskNode = {
  task: DailyTask
  /** Goal the task is tagged with, or "All Goals" when it has none. */
  goalTitle?: string
  /** Title of the owning project, for the chip on a nested task. */
  projectTitle?: string
  /** Drives the one-off highlight animation when a task first appears. */
  isNew?: boolean
  /** How many days this task has been completed on, across its whole history. */
  completedCount?: number
}

export type TaskGroup =
  | {
      kind: 'project'
      project: TaskNode
      children: TaskNode[]
      doneCount: number
      totalCount: number
    }
  | { kind: 'task'; node: TaskNode }

type TaskTreeProps = {
  goal: Goal | null
  goals: Goal[]
  tasks: DailyTask[]
  /** Every day's rows, not just the open day — needed to count completions. */
  dailyTasks: DailyTask[]
  templates: TaskTemplate[]
  /** Template just created, highlighted until `useGoalSpace` clears it. */
  newTemplateId: ID | null
  isAllMode: boolean
}

export function useTaskTree(props: TaskTreeProps) {
  const taskGroups = computed<TaskGroup[]>(() => {
    const goalTitleById = new Map(
      props.goals.map((goal) => [goal.id, goal.title]),
    )

    function goalTitleOf(task: DailyTask) {
      if (!task.goalId) return 'All Goals'
      return goalTitleById.get(task.goalId) ?? 'Unknown Goal'
    }

    const createdRank = new Map(
      props.templates.map((template, index) => [template.id, index]),
    )
    const rankOf = (task: DailyTask) => createdRank.get(task.templateId) ?? -1

    // Newest first, so a task the user just added lands at the top of its list.
    const byNewestFirst = (a: DailyTask, b: DailyTask) => rankOf(b) - rankOf(a)

    const isRecentlyCreated = (task: DailyTask) =>
      props.newTemplateId !== null && task.templateId === props.newTemplateId

    const repeatingTemplateIds = new Set(
      props.templates.filter(isRepeating).map((template) => template.id),
    )

    const completionsByTemplate = new Map<ID, number>()
    props.dailyTasks.forEach((row) => {
      if (row.status !== TASK_STATUS.DONE) return
      completionsByTemplate.set(
        row.templateId,
        (completionsByTemplate.get(row.templateId) ?? 0) + 1,
      )
    })

    function completedCountOf(task: DailyTask) {
      if (!repeatingTemplateIds.has(task.templateId)) return undefined
      return completionsByTemplate.get(task.templateId) ?? 0
    }

    const projects = props.tasks
      .filter((task) => task.priority === PRIORITY.MAJOR)
      .sort(byNewestFirst)

    const groups: TaskGroup[] = []
    const nestedIds = new Set<string>()

    projects.forEach((project) => {
      const children = props.tasks
        .filter((task) => task.parentDailyTaskId === project.id)
        .sort(byNewestFirst)

      children.forEach((child) => nestedIds.add(child.id))

      const projectNode: TaskNode = {
        task: project,
        goalTitle: goalTitleOf(project),
        isNew: isRecentlyCreated(project),
        completedCount: completedCountOf(project),
      }

      if (!children.length) {
        groups.push({ kind: 'task', node: projectNode })
        return
      }

      groups.push({
        kind: 'project',
        project: projectNode,
        children: children.map((child) => ({
          task: child,
          goalTitle: goalTitleOf(child),
          projectTitle: project.title,
          isNew: isRecentlyCreated(child),
          completedCount: completedCountOf(child),
        })),
        doneCount: children.filter((task) => task.status === TASK_STATUS.DONE)
          .length,
        totalCount: children.length,
      })
    })

    // Tasks that don't belong to any visible project stand on their own.
    props.tasks
      .filter(
        (task) => task.priority !== PRIORITY.MAJOR && !nestedIds.has(task.id),
      )
      .forEach((task) => {
        groups.push({
          kind: 'task',
          node: {
            task,
            goalTitle: goalTitleOf(task),
            isNew: isRecentlyCreated(task),
            completedCount: completedCountOf(task),
          },
        })
      })

    return groups.sort((a, b) => {
      const taskOf = (group: TaskGroup) =>
        group.kind === 'project' ? group.project.task : group.node.task
      return byNewestFirst(taskOf(a), taskOf(b))
    })
  })

  const totalCount = computed(() => props.tasks.length)
  const projectCount = computed(
    () => props.tasks.filter((task) => task.priority === PRIORITY.MAJOR).length,
  )
  const taskCount = computed(
    () => props.tasks.filter((task) => task.priority !== PRIORITY.MAJOR).length,
  )

  const panelTitle = computed(() =>
    props.isAllMode ? 'All Goals' : (props.goal?.title ?? 'Goal'),
  )
  const panelDescription = computed(() =>
    props.isAllMode
      ? 'All tasks across goals'
      : (props.goal?.description ?? 'Overview of this goal'),
  )

  return {
    taskGroups,
    totalCount,
    projectCount,
    taskCount,
    panelTitle,
    panelDescription,
  }
}
