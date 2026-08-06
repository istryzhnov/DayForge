import { computed } from 'vue'
import type { Goal } from '../entities/GoalEntity'
import type { DailyTask } from '../entities/TaskEntity'
import { PRIORITY, TASK_STATUS } from '../entities/constants'

export type FlatTaskNode = {
  task: DailyTask
  children: FlatTaskNode[]
  depth: number
  goalTitle?: string
  minorDone?: number
  minorTotal?: number
  majorTitle?: string
  canResolveMajor?: boolean
}

type TaskTreeProps = {
  goal: Goal | null
  goals: Goal[]
  tasks: DailyTask[]
  isAllMode: boolean
}

export function useTaskTree(props: TaskTreeProps) {
  const orderedFlatNodes = computed<FlatTaskNode[]>(() => {
    const goalTitleById = new Map(
      props.goals.map((goal) => [goal.id, goal.title]),
    )

    const majorTasks = props.tasks
      .filter((task) => task.priority === PRIORITY.MAJOR)
      .sort((a, b) => a.title.localeCompare(b.title))

    const minorTasks = props.tasks
      .filter((task) => task.priority === PRIORITY.MINOR)
      .sort((a, b) => a.title.localeCompare(b.title))

    const flat: FlatTaskNode[] = []
    const attachedMinorIds = new Set<string>()

    majorTasks.forEach((major) => {
      const minorChildren = props.tasks
        .filter(
          (task) =>
            task.priority === PRIORITY.MINOR &&
            task.parentDailyTaskId === major.id,
        )
        .sort((a, b) => a.title.localeCompare(b.title))

      const goalTitle = major.goalId
        ? (goalTitleById.get(major.goalId) ?? 'Unknown Goal')
        : 'All Goals'

      flat.push({
        task: major,
        children: [],
        depth: 0,
        goalTitle,
        minorDone: minorChildren.filter(
          (task) => task.status === TASK_STATUS.DONE,
        ).length,
        minorTotal: minorChildren.length,
        canResolveMajor:
          minorChildren.length > 0 &&
          minorChildren.every((task) => task.status === TASK_STATUS.DONE),
      })

      minorChildren.forEach((minor) => {
        attachedMinorIds.add(minor.id)
        flat.push({
          task: minor,
          children: [],
          depth: 1,
          goalTitle,
          majorTitle: major.title,
        })
      })
    })

    // Show minor tasks that are not linked to a visible major task.
    minorTasks
      .filter((minor) => !attachedMinorIds.has(minor.id))
      .forEach((minor) => {
        const goalTitle = minor.goalId
          ? (goalTitleById.get(minor.goalId) ?? 'Unknown Goal')
          : 'All Goals'

        flat.push({
          task: minor,
          children: [],
          depth: 0,
          goalTitle,
        })
      })

    return flat
  })

  const totalCount = computed(() => props.tasks.length)
  const majorCount = computed(
    () => props.tasks.filter((task) => task.priority === PRIORITY.MAJOR).length,
  )
  const subCount = computed(
    () => props.tasks.filter((task) => task.priority === PRIORITY.MINOR).length,
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
    orderedFlatNodes,
    totalCount,
    majorCount,
    subCount,
    panelTitle,
    panelDescription,
  }
}
