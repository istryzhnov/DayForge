import { computed, ref } from 'vue'
import { useGoals } from './useGoals'
import {
  type CreateTaskInput,
  type DailyTask,
  type MajorDecision,
  type TaskSchedule,
  type TaskTemplate,
} from '../entities/TaskEntity'
import type { ID, ISODate, Priority } from '../entities/types'
import {
  MAJOR_DECISION,
  PRIORITY,
  TASK_KIND,
  TASK_STATUS,
} from '../entities/constants'
import { addDaysToISODate, createId, getTodayISODate } from './goalSpace/date'
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
    deleteGoal,
    updateGoalColor,
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
        if (!task.goalId) return
        counts[task.goalId] = (counts[task.goalId] ?? 0) + 1
      })

    return counts
  })

  function createTask(input: CreateTaskInput): TaskTemplate | null {
    const now = new Date().toISOString()
    const priority = input.priority ?? PRIORITY.MINOR

    let goalId: ID | undefined
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
      id: createId(parentTemplateId ? TASK_KIND.SUBTASK : TASK_KIND.TASK),
      goalId,
      title: input.title,
      priority,
      parentTemplateId,
      order,
      tagIds: [],
      recurrence: input.schedule?.recurrence,
      startTime: input.schedule?.startTime,
      endTime: input.schedule?.endTime,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }

    taskTemplates.value.push(newTask)

    // A scheduled task materializes on its own date rather than today — for a
    // future date, today is simply not one of its occurrences.
    ensureDailyTaskForTemplate({
      taskTemplates: taskTemplates.value,
      dailyTasks: dailyTasks.value,
      template: newTask,
      date: input.schedule?.date ?? currentDate.value,
    })

    return newTask
  }

  function addTask(
    goalId: ID | undefined,
    title: string,
    priority: Priority = PRIORITY.MINOR,
    schedule?: TaskSchedule,
  ) {
    return createTask({
      kind: TASK_KIND.TASK,
      goalId,
      title,
      priority,
      schedule,
    })
  }

  function addMinorInAllMode(
    title: string,
    goalId?: ID,
    majorTemplateId?: ID,
    schedule?: TaskSchedule,
  ) {
    if (majorTemplateId) {
      return addSubTask(majorTemplateId, title, PRIORITY.MINOR, schedule)
    }

    return addTask(goalId, title, PRIORITY.MINOR, schedule)
  }

  function addSubTask(
    parentTemplateId: ID,
    title: string,
    priority: Priority = PRIORITY.MINOR,
    schedule?: TaskSchedule,
  ) {
    return createTask({
      kind: TASK_KIND.SUBTASK,
      parentTemplateId,
      title,
      priority,
      schedule,
    })
  }

  function editTaskTitle(templateId: ID, title: string) {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    const template = taskTemplates.value.find((item) => item.id === templateId)
    if (!template) return

    template.title = trimmedTitle
    template.updatedAt = new Date().toISOString()

    dailyTasks.value
      .filter((item) => item.templateId === templateId)
      .forEach((item) => {
        item.title = trimmedTitle
      })
  }

  function deleteTask(templateId: ID) {
    const idsToRemove = new Set<ID>()

    function collectDescendants(id: ID) {
      idsToRemove.add(id)
      taskTemplates.value
        .filter((item) => item.parentTemplateId === id)
        .forEach((child) => collectDescendants(child.id))
    }

    collectDescendants(templateId)

    taskTemplates.value = taskTemplates.value.filter(
      (item) => !idsToRemove.has(item.id),
    )
    // Keep past days untouched so historical habit-calendar stats stay accurate;
    // only drop today's/future instances of the removed template(s).
    dailyTasks.value = dailyTasks.value.filter(
      (item) =>
        !idsToRemove.has(item.templateId) || item.date < currentDate.value,
    )
  }

  function removeGoal(goalId: ID) {
    taskTemplates.value = taskTemplates.value.filter(
      (item) => item.goalId !== goalId,
    )
    dailyTasks.value = dailyTasks.value.filter((item) => item.goalId !== goalId)
    deleteGoal(goalId)
  }

  function scheduleDailyTask(
    dailyTaskId: ID,
    startTime: string,
    endTime: string,
  ) {
    const task = dailyTasks.value.find((item) => item.id === dailyTaskId)
    if (!task) return
    task.startTime = startTime
    task.endTime = endTime
  }

  function unscheduleDailyTask(dailyTaskId: ID) {
    const task = dailyTasks.value.find((item) => item.id === dailyTaskId)
    if (!task) return
    task.startTime = undefined
    task.endTime = undefined
  }

  function goToDate(date: ISODate) {
    currentDate.value = date
    ensureTodaySnapshot(taskTemplates.value, dailyTasks.value, date)
  }

  function goToPreviousDay() {
    goToDate(addDaysToISODate(currentDate.value, -1))
  }
  function goToNextDay() {
    goToDate(addDaysToISODate(currentDate.value, 1))
  }

  function goToToday() {
    goToDate(getTodayISODate())
  }

  const activeMajorTemplates = computed(() =>
    taskTemplates.value.filter(
      (task) => task.priority === PRIORITY.MAJOR && task.isActive,
    ),
  )

  function addMajorWithMinor(
    goalId: ID,
    majorTitle: string,
    minorTitle: string,
  ) {
    const major = addTask(goalId, majorTitle, PRIORITY.MAJOR)
    if (!major) return null

    return addSubTask(major.id, minorTitle, PRIORITY.MINOR)
  }

  function toggleMinorDone(dailyTaskId: ID) {
    const task = dailyTasks.value.find((item) => item.id === dailyTaskId)
    if (!task || task.priority !== PRIORITY.MINOR) return

    if (task.status === TASK_STATUS.DONE) {
      task.status = TASK_STATUS.TODO
      task.completedAt = undefined
      return
    }
    task.status = TASK_STATUS.DONE
    task.completedAt = new Date().toISOString()
  }

  function resolveMajorTask(dailyMajorTaskId: ID, decision: MajorDecision) {
    const majorTask = dailyTasks.value.find(
      (item) => item.id === dailyMajorTaskId,
    )
    if (!majorTask || majorTask.priority !== PRIORITY.MAJOR) return

    const minorChildren = dailyTasks.value.filter(
      (item) =>
        item.date === currentDate.value &&
        item.parentDailyTaskId === dailyMajorTaskId &&
        item.priority === PRIORITY.MINOR,
    )
    const allMinorDone =
      minorChildren.length > 0 &&
      minorChildren.every((item) => item.status === TASK_STATUS.DONE)

    if (!allMinorDone) return

    majorTask.majorDecision = decision

    if (decision === MAJOR_DECISION.CONTINUE) {
      majorTask.status = TASK_STATUS.TODO
      majorTask.completedAt = undefined
      return
    }

    majorTask.status = TASK_STATUS.DONE
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
    deleteGoal: removeGoal,
    updateGoalColor,
    addTask,
    addSubTask,
    editTaskTitle,
    deleteTask,
    initializeStorage,
    toggleMinorDone,
    resolveMajorTask,
    activeMajorTemplates,
    addMajorWithMinor,
    addMinorInAllMode,
    scheduleDailyTask,
    unscheduleDailyTask,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    goToDate,
  }
}
