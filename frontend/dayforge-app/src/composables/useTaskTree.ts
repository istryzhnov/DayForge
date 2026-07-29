import { computed } from 'vue'
import type { Goal } from '../entities/GoalEntity'
import type { DailyTask } from '../entities/TaskEntity'

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

export function useTaskTree(props: TaskTreeProps, showMajorTasks: { value: boolean }) {
  const orderedFlatNodes = computed<FlatTaskNode[]>(() => {
    const majorTasks = props.tasks
      .filter((task) => task.priority === 'major')
      .sort((a, b) => a.title.localeCompare(b.title))

    const flat: FlatTaskNode[] = []

    majorTasks.forEach((task) => {
      if (!showMajorTasks.value) return

      const minorChildren = props.tasks.filter(
        (child) => child.parentDailyTaskId === task.id,
      )

      flat.push({
        task,
        children: [],
        depth: 0,
        goalTitle: props.goal?.title ?? 'All Goals',
        minorDone: minorChildren.filter((child) => child.status === 'done').length,
        minorTotal: minorChildren.length,
        majorTitle: task.title,
        canResolveMajor: minorChildren.length > 0 && minorChildren.every((child) => child.status === 'done'),
      })
    })

    return flat
  })

  const totalCount = computed(() => props.tasks.length)
  const majorCount = computed(() => props.tasks.filter((task) => task.priority === 'major').length)
  const subCount = computed(() => props.tasks.filter((task) => task.priority === 'minor').length)

  const panelTitle = computed(() => (props.isAllMode ? 'All Goals' : props.goal?.title ?? 'Goal'))
  const panelDescription = computed(() =>
    props.isAllMode
      ? 'All tasks across goals'
      : props.goal?.description ?? 'Overview of this goal',
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
