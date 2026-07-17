import { computed, type Ref } from 'vue'
import type { Goal } from '../entities/GoalEntity'
import type { DailyTask } from '../entities/TaskEntity'
import type { ID } from '../entities/types'
import { rewriteDefault } from 'vue/compiler-sfc'

type FlatNode = {
  task: DailyTask
  depth: number
  goalTitle: string
  majorTitle?: string
  minorDone: number
  minorTotal: number
  canResolveMajor: boolean
  majorResolved: boolean
}

type UseTaskTreeInput = {
  goal: Goal | null
  goals: Goal[]
  tasks: DailyTask[]
  isAllMode: boolean
}

export const useTaskTree = (
  props: UseTaskTreeInput,
  showMajorTasks: Ref<boolean>,
) => {
  const orderedFlatNodes = computed<FlatNode[]>(() => {
    const sorted = [...props.tasks]
    const taskById = new Map(sorted.map((task) => [task.id, task]))

    const childrenMap = new Map<ID, DailyTask[]>()
    const roots: DailyTask[] = []

    for (const task of sorted) {
      if (!task.parentDailyTaskId) {
        roots.push(task)
        continue
      }
      const list = childrenMap.get(task.parentDailyTaskId) ?? []
      list.push(task)
      childrenMap.set(task.parentDailyTaskId, list)
    }
    const out: FlatNode[] = []
    const goalById = new Map(props.goals.map((goal) => [goal.id, goal.title]))

    function collectMinorStats(taskId: ID): { done: number; total: number } {
      const children = childrenMap.get(taskId) ?? []
      let done = 0
      let total = 0

      for (const child of children) {
        if (child.priority === 'minor') {
          total += 1
          if (child.status === 'done') done += 1
        }

        const nested = collectMinorStats(child.id)
        done += nested.done
        total += nested.total
      }

      return { done, total }
    }

    function findMajorTitle(task: DailyTask): string | undefined {
      let current: DailyTask | undefined = task

      while (current) {
        if (current.priority === 'major') return current.title
        if (!current.parentDailyTaskId) return undefined
        current = taskById.get(current.parentDailyTaskId)
      }

      return undefined
    }

    function traverse(task: DailyTask, depth: number) {
      const stats =
        task.priority === 'major'
          ? collectMinorStats(task.id)
          : { done: 0, total: 0 }
      const canResolveMajor =
        task.priority === 'major' &&
        stats.total > 0 &&
        stats.done === stats.total &&
        !task.majorDecision

      out.push({
        task,
        depth,
        goalTitle: goalById.get(task.goalId) ?? 'Unknown Goal',
        majorTitle: findMajorTitle(task),
        minorDone: stats.done,
        minorTotal: stats.total,
        canResolveMajor,
        majorResolved: Boolean(task.majorDecision),
      })

      const children = childrenMap.get(task.id) ?? []
      for (const child of children) {
        traverse(child, depth + 1)
      }
    }

    for (const root of roots) {
      traverse(root, 0)
    }

    if (props.isAllMode && !showMajorTasks.value) {
      return out.filter((node) => node.task.priority !== 'major')
    }

    return out
  })

  const totalCount = computed(() => props.tasks.length)
  const majorCount = computed(
    () => props.tasks.filter((task) => task.priority === 'major').length,
  )

  const subCount = computed(
    () => props.tasks.filter((task) => task.parentDailyTaskId).length,
  )
  const panelTitle = computed(() =>
    props.isAllMode ? 'All Goals' : (props.goal?.title ?? 'Goal'),
  )

  const panelDescription = computed(() =>
    props.isAllMode
      ? 'Overview of all tasks across your goals'
      : (props.goal?.description ?? 'Detailed task breakdown for this goal'),
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
