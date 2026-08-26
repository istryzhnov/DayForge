import { computed, ref } from 'vue'
import { useGoals } from './useGoals'
import {
  type CreateTaskInput,
  type DailyTask,
  type TaskSchedule,
  type TaskTemplate,
} from '../entities/TaskEntity'
import type { ID, ISODate, Priority } from '../entities/types'
import { PRIORITY, TASK_KIND, TASK_STATUS } from '../entities/constants'
import { useUndoToast } from './useUndoToast'

/** How long a freshly created task keeps its "just added" highlight. */
const NEW_TASK_HIGHLIGHT_MS = 1500
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
    updateGoalTheme,
    loadFromStorage,
  } = useGoals()

  const { offerUndo } = useUndoToast()

  const taskTemplates = ref<TaskTemplate[]>([])
  const dailyTasks = ref<DailyTask[]>([])
  const currentDate = ref<ISODate>(getTodayISODate())

  const lastCreatedTemplateId = ref<ID | null>(null)
  let highlightTimerId: number | undefined

  function markRecentlyCreated(templateId: ID) {
    lastCreatedTemplateId.value = templateId
    if (highlightTimerId !== undefined) window.clearTimeout(highlightTimerId)
    highlightTimerId = window.setTimeout(() => {
      lastCreatedTemplateId.value = null
      highlightTimerId = undefined
    }, NEW_TASK_HIGHLIGHT_MS)
  }

  function loadFromStorageTasks() {
    const stored = loadJson<TaskTemplate[]>(TASKS_STORAGE_KEY, [])

    stored.forEach((template) => {
      if (template.recurrence?.endDate) {
        delete template.recurrence.endDate
      }
    })

    taskTemplates.value = stored
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
    markRecentlyCreated(newTask.id)

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
    convertTaskToProject(parentTemplateId)

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

    const removedTitle =
      taskTemplates.value.find((item) => item.id === templateId)?.title ??
      'Task'

    const removedTemplates = taskTemplates.value.filter((item) =>
      idsToRemove.has(item.id),
    )
    const removedDailyTasks = dailyTasks.value.filter(
      (item) =>
        idsToRemove.has(item.templateId) && item.date >= currentDate.value,
    )

    taskTemplates.value = taskTemplates.value.filter(
      (item) => !idsToRemove.has(item.id),
    )
    dailyTasks.value = dailyTasks.value.filter(
      (item) =>
        !idsToRemove.has(item.templateId) || item.date < currentDate.value,
    )

    offerUndo(`Deleted "${removedTitle}"`, () => {
      taskTemplates.value = [...taskTemplates.value, ...removedTemplates]
      dailyTasks.value = [...dailyTasks.value, ...removedDailyTasks]
    })
  }

  function applyGoalToTask(template: TaskTemplate, goalId: ID | undefined) {
    template.goalId = goalId
    template.updatedAt = new Date().toISOString()

    dailyTasks.value
      .filter(
        (row) =>
          row.templateId === template.id && row.date >= currentDate.value,
      )
      .forEach((row) => {
        row.goalId = goalId
      })

    taskTemplates.value
      .filter((child) => child.parentTemplateId === template.id)
      .forEach((child) => applyGoalToTask(child, goalId))
  }

  function assignTaskToGoal(templateId: ID, goalId: ID | undefined) {
    const template = taskTemplates.value.find((item) => item.id === templateId)
    if (!template || template.goalId === goalId) return

    if (template.parentTemplateId) {
      const parent = taskTemplates.value.find(
        (item) => item.id === template.parentTemplateId,
      )
      if (parent && parent.goalId !== goalId) {
        attachTaskToProject(templateId, null)
      }
    }

    applyGoalToTask(template, goalId)
  }

  function attachTaskToProject(templateId: ID, projectTemplateId: ID | null) {
    const template = taskTemplates.value.find((item) => item.id === templateId)
    if (!template || template.priority === PRIORITY.MAJOR) return

    const project = projectTemplateId
      ? taskTemplates.value.find((item) => item.id === projectTemplateId)
      : null
    if (projectTemplateId && (!project || project.id === templateId)) return

    template.parentTemplateId = project?.id
    template.updatedAt = new Date().toISOString()

    if (project && project.goalId !== template.goalId) {
      applyGoalToTask(template, project.goalId)
    }

    dailyTasks.value
      .filter(
        (item) =>
          item.templateId === templateId && item.date >= currentDate.value,
      )
      .forEach((row) => {
        if (!project) {
          row.parentDailyTaskId = undefined
          return
        }

        ensureDailyTaskForTemplate({
          taskTemplates: taskTemplates.value,
          dailyTasks: dailyTasks.value,
          template: project,
          date: row.date,
        })

        row.parentDailyTaskId = dailyTasks.value.find(
          (item) => item.templateId === project.id && item.date === row.date,
        )?.id
      })
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

  function toggleTaskDone(dailyTaskId: ID) {
    const task = dailyTasks.value.find((item) => item.id === dailyTaskId)
    if (!task) return

    if (task.status === TASK_STATUS.DONE) {
      task.status = TASK_STATUS.TODO
      task.completedAt = undefined
      return
    }
    task.status = TASK_STATUS.DONE
    task.completedAt = new Date().toISOString()
  }

  function togglePlannedTask(templateId: ID, date: ISODate) {
    const template = taskTemplates.value.find((item) => item.id === templateId)
    if (!template) return

    ensureDailyTaskForTemplate({
      taskTemplates: taskTemplates.value,
      dailyTasks: dailyTasks.value,
      template,
      date,
    })

    const row = dailyTasks.value.find(
      (item) => item.templateId === templateId && item.date === date,
    )
    if (row) toggleTaskDone(row.id)
  }

  function convertTaskToProject(templateId: ID) {
    const template = taskTemplates.value.find((item) => item.id === templateId)
    if (!template) return
    if (template.priority === PRIORITY.MAJOR) return
    if (template.parentTemplateId) return

    template.priority = PRIORITY.MAJOR
    template.updatedAt = new Date().toISOString()

    dailyTasks.value
      .filter(
        (item) =>
          item.templateId === templateId && item.date >= currentDate.value,
      )
      .forEach((item) => {
        item.priority = PRIORITY.MAJOR
      })
  }

  return {
    goals,
    activeGoalId,
    activeGoal,
    taskTemplates,
    dailyTasks,
    currentDate,
    lastCreatedTemplateId,
    tasksForActiveGoal,
    taskCountByGoal,
    selectGoal,
    setGoals,
    createGoal,
    deleteGoal: removeGoal,
    updateGoalColor,
    updateGoalTheme,
    addTask,
    addSubTask,
    editTaskTitle,
    deleteTask,
    initializeStorage,
    toggleTaskDone,
    togglePlannedTask,
    convertTaskToProject,
    attachTaskToProject,
    assignTaskToGoal,
    activeMajorTemplates,
    addMinorInAllMode,
    scheduleDailyTask,
    unscheduleDailyTask,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    goToDate,
  }
}
