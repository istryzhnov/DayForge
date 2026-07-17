import { computed, ref } from 'vue'
import { useGoals } from './useGoals'
import {
  TASK_KIND,
  type CreateTaskInput,
  type DailyTask,
  type MajorDecision,
  type TaskTemplate,
} from '../entities/TaskEntity'
import type { ID, ISODate, Priority } from '../entities/types'
import { createId, getTodayISODate } from './goalSpace/date'
import {
  bindStorage,
  DAILY_TASKS_STORAGE_KEY,
  loadJson,
  TASKS_STORAGE_KEY,
} from './goalSpace/storage'
import {
  ensureDailyTaskForTemplate,
  ensureTodaySnapshot,
} from './goalSpace/dailyTasks'

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
  const dailyTasks = ref<DailyTask[]>([])
  const currentDate = ref<ISODate>(getTodayISODate())

  function loadFromStorageTasks() {
    taskTemplates.value = loadJson<TaskTemplate[]>(TASKS_STORAGE_KEY, [])
  }

  function loadFromStorageDailyTasks() {
    dailyTasks.value = loadJson<DailyTask[]>(DAILY_TASKS_STORAGE_KEY, [])
  }

  function initializeStorage() {
    loadFromStorage()
    loadFromStorageTasks()
    loadFromStorageDailyTasks()
    ensureTodaySnapshot(
      taskTemplates.value,
      dailyTasks.value,
      currentDate.value,
    )
  }

  bindStorage(taskTemplates, TASKS_STORAGE_KEY)
  bindStorage(dailyTasks, DAILY_TASKS_STORAGE_KEY)

  const tasksForActiveGoal = computed(() => {
    const todayTasks = dailyTasks.value.filter(
      (task) => task.date === currentDate.value,
    )

    return activeGoalId.value
      ? todayTasks.filter((task) => task.goalId === activeGoalId.value)
      : todayTasks
  })

  const taskCountByGoal = computed<Record<ID, number>>(() => {
    const counts: Record<ID, number> = {}

    goals.value.forEach((goal) => {
      counts[goal.id] = 0
    })

    dailyTasks.value
      .filter((task) => task.date === currentDate.value)
      .forEach((task) => {
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
    ensureDailyTaskForTemplate({
      taskTemplates: taskTemplates.value,
      dailyTasks: dailyTasks.value,
      template: newTask,
      date: currentDate.value,
    })

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

  const activeMajorTemplates = computed(() =>
    taskTemplates.value.filter(
      (task) => task.priority === 'major' && task.isActive,
    ),
  )

  function addMajorWithMinor(
    goalId: ID,
    majorTitle: string,
    minorTitle: string,
  ) {
    const major = addTask(goalId, majorTitle, 'major')
    if (!major) return null

    return addSubTask(major.id, majorTitle, 'minor')
  }

  function toggleMinorDone(dailyTaskId: ID) {
    const task = dailyTasks.value.find((item) => item.id === dailyTaskId)
    if (!task || task.priority !== 'minor') return

    if (task.status === 'done') {
      task.status = 'todo'
      task.completedAt = undefined
      return
    }
    task.status = 'done'
    task.completedAt = new Date().toISOString()
  }

  function resolveMajorTask(dailyMajorTaskId: ID, decision: MajorDecision) {
    const majorTask = dailyTasks.value.find(
      (item) => item.id === dailyMajorTaskId,
    )
    if (!majorTask || majorTask.priority !== 'major') return

    const minorChildren = dailyTasks.value.filter(
      (item) =>
        item.date === currentDate.value &&
        item.parentDailyTaskId === dailyMajorTaskId &&
        item.priority === 'minor',
    )
    const allMinorDone =
      minorChildren.length > 0 &&
      minorChildren.every((item) => item.status === 'done')

    if (!allMinorDone) return

    majorTask.majorDecision = decision

    if (decision === 'continue') {
      majorTask.status = 'todo'
      majorTask.completedAt = undefined
      return
    }

    majorTask.status = 'done'
    majorTask.completedAt = new Date().toISOString()

    const template = taskTemplates.value.find(
      (item) => item.id === majorTask.templateId,
    )
    if (!template) return

    template.isActive = false
    template.updatedAt = new Date().toISOString()
  }

  return {
    goals,
    activeGoalId,
    activeGoal,
    taskTemplates,
    dailyTasks,
    currentDate,
    tasksForActiveGoal,
    taskCountByGoal,
    selectGoal,
    setGoals,
    createGoal,
    addTask,
    addSubTask,
    initializeStorage,
    toggleMinorDone,
    resolveMajorTask,
    activeMajorTemplates,
    addMajorWithMinor,
  }
}
