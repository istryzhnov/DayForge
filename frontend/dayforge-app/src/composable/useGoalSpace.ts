import { computed, ref } from 'vue'
import {
  TASK_KIND,
  type CreateTaskInput,
  type TaskTemplate,
} from '../entities/TaskEntity'
import type { ID, Priority } from '../entities/types'
import { useGoals } from './useGoals'

function createId(prefix: string): ID {
  return `${prefix}-${Date.now()}`
}
export function useGoalSpace() {
  const { goals, activeGoalId, activeGoal, selectGoal, setGoals, createGoal } =
    useGoals()

  const taskTemplates = ref<TaskTemplate[]>([])

  const tasksForActiveGoal = computed(() =>
    taskTemplates.value.filter((task) => task.goalId === activeGoalId.value),
  )

  function createTask(input: CreateTaskInput): TaskTemplate | null {
    const now = new Date().toISOString()

    const priority = input.priority ?? 'minor'

    let goalId: ID
    let parentTemplateId: ID | undefined

    if (input.kind === TASK_KIND.TASK) {
      goalId = input.goalId
    } else {
      const parent = taskTemplates.value.find(
        (task) => task.id === input.parentTemplateId,
      )
      if (!parent) return null
      goalId = parent.goalId
      parentTemplateId = parent.id
    }

    const order = taskTemplates.value.filter((task) => {
      if (task.goalId !== goalId) return false
      if (parentTemplateId) return task.parentTemplateId === parentTemplateId
      return !task.parentTemplateId
    }).length

    const newTask: TaskTemplate = {
      id: createId(parentTemplateId ? 'subtask' : 'task'),
      goalId,
      title: input.title,
      priority,
      parentTemplateId,
      order,
      tagIds: [],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }
    taskTemplates.value.push(newTask)
    return newTask
  }

  function addTask(goalId: ID, title: string, priority: Priority = 'minor') {
    return createTask({ kind: TASK_KIND.TASK, goalId, title, priority })
  }

  function addSubTask(
    parentTemplateId: ID,
    title: string,
    priority: Priority = 'minor',
  ) {
    return createTask({
      kind: TASK_KIND.SUBTASK,
      parentTemplateId,
      title,
      priority,
    })
  }

  return {
    goals,
    activeGoalId,
    activeGoal,
    taskTemplates,
    tasksForActiveGoal,
    selectGoal,
    setGoals,
    createGoal,
    addTask,
    addSubTask,
  }
}
