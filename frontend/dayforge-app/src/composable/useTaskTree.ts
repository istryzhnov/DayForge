import { computed } from 'vue'
import type { Goal } from '../entities/GoalEntity'
import type { TaskTemplate } from '../entities/TaskEntity'
import type { ID } from '../entities/types'

type FlatNode = {
  task: TaskTemplate
  depth: number
  goalTitle: string
}

type UseTaskTreeInput = {
  goal: Goal | null
  goals: Goal[]
  tasks: TaskTemplate[]
  isAllMode: boolean
}

export const useTaskTree = (props: UseTaskTreeInput) => {
  const orderedFlatNodes = computed<FlatNode[]>(() => {
    const sorted = [...props.tasks].sort((a, b) => a.order - b.order)

    const childrenMap = new Map<ID, TaskTemplate[]>()
    const roots: TaskTemplate[] = []

    for (const task of sorted) {
      if (!task.parentTemplateId) {
        roots.push(task)
        continue
      }
      const list = childrenMap.get(task.parentTemplateId) ?? []
      list.push(task)
      childrenMap.set(task.parentTemplateId, list)
    }
    const out: FlatNode[] = []
    const goalById = new Map(props.goals.map((goal) => [goal.id, goal.title]))

    function traverse(task: TaskTemplate, depth: number) {
      out.push({
        task,
        depth,
        goalTitle: goalById.get(task.goalId) ?? 'Unknown Goal',
      })
      const children = (childrenMap.get(task.id) ?? []).sort(
        (a, b) => a.order - b.order,
      )
      for (const child of children) {
        traverse(child, depth + 1)
      }
    }

    for (const root of roots) {
      traverse(root, 0)
    }

    return out
  })

  const totalCount = computed(() => props.tasks.length)
  const majorCount = computed(
    () => props.tasks.filter((task) => task.priority === 'major').length,
  )

  const subCount = computed(
    () => props.tasks.filter((task) => task.parentTemplateId).length,
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
