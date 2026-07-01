import { computed, ref, watch } from 'vue'
import {
  TASK_KIND,
  type CreateTaskInput,
  type TaskTemplate,
} from '../entities/TaskEntity'
import type { ID, Priority } from '../entities/types'
import { useGoals } from './useGoals'

const TASKS_STORAGE_KEY = 'dayforge_tasks'

function createId(prefix: string): ID {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}
export function useGoalSpace() {
  const {
    goals,
    activeGoalId,
    activeGoal,
    selectGoal,
    setGoals,
    createGoal,
    loadFromStorage,
  } = useGoals()

  const taskTemplates = ref<TaskTemplate[]>([])

  //load task from storage
  function loadFromStorageTasks() {
    try {
      const stored = localStorage.getItem(TASKS_STORAGE_KEY)
      if (stored) {
        taskTemplates.value = JSON.parse(stored)
      }
    } catch (e) {
      console.error('Failed to load tasks from storage:', e)
    }
  }

  function initializeStorage() {
    loadFromStorage()
    loadFromStorageTasks()
  }

  watch(
    () => taskTemplates.value,
    (newTasks) => {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(newTasks))
    },
    { deep: true },
  )

  const tasksForActiveGoal = computed(() =>
    activeGoalId.value
      ? taskTemplates.value.filter((task) => task.goalId === activeGoalId.value)
      : taskTemplates.value,
  )

  const taskCountByGoal = computed<Record<ID, number>>(() => {
    const counts: Record<ID, number> = {}

    goals.value.forEach((goal) => {
      counts[goal.id] = 0
    })

    taskTemplates.value.forEach((task) => {
      counts[task.goalId] = (counts[task.goalId] ?? 0) + 1
    })

    return counts
  })

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
    taskCountByGoal,
    selectGoal,
    setGoals,
    createGoal,
    addTask,
    addSubTask,
    initializeStorage,
  }
}
