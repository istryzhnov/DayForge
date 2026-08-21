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
    loadFromStorage,
  } = useGoals()

  const taskTemplates = ref<TaskTemplate[]>([])
  const dailyTasks = ref<DailyTask[]>([])
  const currentDate = ref<ISODate>(getTodayISODate())

  /**
   * The template just created, so its row can play a one-off highlight. Held in
   * a ref (rather than derived from `createdAt`) so clearing it is a reactive
   * change that reliably re-renders the list.
   */
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
    markRecentlyCreated(newTask.id)

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
    // Anything that gains children is a project by definition, so giving a plain
    // task a subtask promotes it rather than leaving a task that groups others.
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

  /**
   * Move a task under a project, or detach it when `projectTemplateId` is null.
   *
   * Like `deleteTask` and `convertTaskToProject`, only today's and future rows
   * are rewritten — past days keep the grouping they were completed under.
   * Projects are excluded because nesting is capped at two levels.
   */
  function attachTaskToProject(templateId: ID, projectTemplateId: ID | null) {
    const template = taskTemplates.value.find((item) => item.id === templateId)
    if (!template || template.priority === PRIORITY.MAJOR) return

    const project = projectTemplateId
      ? taskTemplates.value.find((item) => item.id === projectTemplateId)
      : null
    if (projectTemplateId && (!project || project.id === templateId)) return

    template.parentTemplateId = project?.id
    template.updatedAt = new Date().toISOString()

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

        // The project may not have a row on that date yet — create it so the
        // task has something to hang off.
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

  // Every task closes the same way, projects included — a project is a grouping
  // container, not a task with its own lifecycle.
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

  /**
   * Promote a plain task into a project so it can group others.
   *
   * Only today's and future occurrences change: rewriting past rows would
   * restate history the habit calendar already counted (same rule as
   * `deleteTask`). Nesting is capped at two levels, so a task that already sits
   * inside a project cannot become one.
   */
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
    addTask,
    addSubTask,
    editTaskTitle,
    deleteTask,
    initializeStorage,
    toggleTaskDone,
    convertTaskToProject,
    attachTaskToProject,
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
