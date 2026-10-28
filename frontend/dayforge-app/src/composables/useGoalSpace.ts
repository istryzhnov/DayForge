import { computed, ref, watch } from 'vue'
import { useGoals } from './useGoals'
import {
  type CreateTaskInput,
  type DailyTask,
  type TaskSchedule,
  type TaskTemplate,
} from '../entities/TaskEntity'
import type {
  GoalStatus,
  ID,
  ISODate,
  ISODateTime,
  Priority,
} from '../entities/types'
import {
  GOAL_STATUS,
  PRIORITY,
  TASK_KIND,
  TASK_STATUS,
  type BoardStage,
} from '../entities/constants'
import { useUndoToast } from './useUndoToast'

/** How long a freshly created task keeps its "just added" highlight. */
const NEW_TASK_HIGHLIGHT_MS = 1500
import { addDaysToISODate, createId, getTodayISODate } from './goalSpace/date'
import { dayToShowAfterChange, useToday } from './goalSpace/today'
import { isRepeating } from './goalSpace/recurrence'
import { DAILY_TASKS_STORAGE_KEY, TASKS_STORAGE_KEY } from './goalSpace/storage'
import { normalizeNotes } from './goalSpace/notes'
import {
  nextTopOrder,
  orderFromStoredPosition,
  planTaskNudge,
  planTaskReorder,
} from './goalSpace/taskOrder'
import { rowsShownOn } from './goalSpace/overnight'
import {
  bindStorage,
  onExternalWrite,
  parseStored,
  readJson,
  writeJson,
} from '../lib/storage'
import { stableStringify } from '../sync/diff'
import {
  ensureDailyTaskForTemplate,
  ensureTodaySnapshot,
  migrateDailyTasks,
  touchRow,
} from './goalSpace/dailyTasks'
import { useTombstones } from './useTombstones'
import { i18n } from '../i18n'
import { SYNC_TABLE, type SyncedRow } from '../sync/types'
import { DAILY_FIELD_GROUPS } from '../sync/merge'

/** Set once this browser's task list was numbered from its stored position. */
const TASK_ORDER_MIGRATED_KEY = 'dayforge-task-order-migrated-v1'

export function useGoalSpace() {
  const {
    goals,
    activeGoalId,
    activeGoal,
    selectGoal,
    setGoals,
    createGoal,
    deleteGoal,
    updateGoalDetails,
    updateGoalStatus,
    updateGoalTheme,
    updateGoalRate,
    updateGoalClient,
    updateGoalIcon,
    updateGoalBoard,
    updateGoalNotes,
    reorderGoals,
    restoreGoal,
    loadFromStorage,
  } = useGoals()

  const { bury, exhumeAll, keepLive } = useTombstones()

  /**
   * Projects that are not active stop generating rows: their repeats do not
   * fire and their unfinished tasks are left on the day they were abandoned.
   */
  const pausedGoalIds = computed(
    () =>
      new Set(
        goals.value
          .filter((goal) => goal.status !== GOAL_STATUS.ACTIVE)
          .map((goal) => goal.id),
      ),
  )

  const { offerUndo } = useUndoToast()

  const taskTemplates = ref<TaskTemplate[]>([])
  const dailyTasks = ref<DailyTask[]>([])
  const today = useToday()
  const currentDate = ref<ISODate>(today.value)

  // When midnight passes, a view on the old today moves on, so new tasks are
  // filed under today and today's repeats get created. Going through goToDate
  // runs the same snapshot step as any other day change.
  watch(today, (next, previous) => {
    const shown = dayToShowAfterChange(currentDate.value, previous, next)
    if (shown !== currentDate.value) goToDate(shown)
  })

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
    const stored = keepLive(
      SYNC_TABLE.TASK_TEMPLATES,
      readJson<TaskTemplate[]>(TASKS_STORAGE_KEY, []),
    )

    stored.forEach((template) => {
      if (template.recurrence?.endDate) {
        delete template.recurrence.endDate
      }
    })

    // Once per browser: keep the order people arranged by dragging before the
    // number on each row was used. A fresh browser has nothing to carry over.
    if (!readJson<boolean>(TASK_ORDER_MIGRATED_KEY, false)) {
      orderFromStoredPosition(stored)
      writeJson(TASK_ORDER_MIGRATED_KEY, true)
    }

    taskTemplates.value = stored
  }

  function loadFromStorageDailyTasks() {
    dailyTasks.value = migrateDailyTasks(
      keepLive(
        SYNC_TABLE.DAILY_TASKS,
        readJson<DailyTask[]>(DAILY_TASKS_STORAGE_KEY, []),
      ),
    )
  }

  /**
   * Takes the templates or day rows another tab saved, so this tab does not
   * save its older copy over them. Only the rows are read: the stored copy was
   * migrated when that tab loaded it. Identical content changes nothing, which
   * is what keeps two tabs from saving back and forth.
   */
  function reloadTasksFromStorage(raw: string) {
    const parsed = parseStored(raw)
    if (!Array.isArray(parsed)) return
    const next = keepLive(SYNC_TABLE.TASK_TEMPLATES, parsed as TaskTemplate[])
    if (stableStringify(next) !== stableStringify(taskTemplates.value)) {
      taskTemplates.value = next
    }
  }

  function reloadDailyTasksFromStorage(raw: string) {
    const parsed = parseStored(raw)
    if (!Array.isArray(parsed)) return
    const next = keepLive(SYNC_TABLE.DAILY_TASKS, parsed as DailyTask[])
    if (stableStringify(next) !== stableStringify(dailyTasks.value)) {
      dailyTasks.value = next
    }
  }

  function initializeStorage() {
    loadFromStorage()
    loadFromStorageTasks()
    loadFromStorageDailyTasks()
    ensureTodaySnapshot(
      taskTemplates.value,
      dailyTasks.value,
      currentDate.value,
      pausedGoalIds.value,
    )

    onExternalWrite(TASKS_STORAGE_KEY, reloadTasksFromStorage)
    onExternalWrite(DAILY_TASKS_STORAGE_KEY, reloadDailyTasksFromStorage)
  }

  bindStorage(taskTemplates, TASKS_STORAGE_KEY)
  bindStorage(dailyTasks, DAILY_TASKS_STORAGE_KEY)

  // A task that runs past midnight is listed on the day after too, as one row.
  const tasksForActiveGoal = computed(() => {
    const todayTasks = rowsShownOn(dailyTasks.value, currentDate.value)

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

    // The new task goes on top of its list, whichever project is in view.
    const order = nextTopOrder(
      taskTemplates.value.filter(
        (task) =>
          (task.parentTemplateId ?? null) === (parentTemplateId ?? null),
      ),
    )

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
        touchRow(item)
      })
  }

  /** Blank notes remove the field, so a cleared note leaves no trace behind. */
  function updateTaskNotes(templateId: ID, notes: string) {
    const template = taskTemplates.value.find((item) => item.id === templateId)
    if (!template) return

    const next = normalizeNotes(notes)
    if (next === template.notes) return

    if (next === undefined) {
      delete template.notes
    } else {
      template.notes = next
    }
    template.updatedAt = new Date().toISOString()
  }

  /**
   * Which open column a task sits in. `undefined` (or "todo") removes the key
   * entirely, so a task that never used the board serialises exactly as before.
   */
  function setTaskBoardStage(templateId: ID, stage: BoardStage | undefined) {
    const template = taskTemplates.value.find((item) => item.id === templateId)
    if (!template || template.boardStage === stage) return

    if (stage === undefined) {
      delete template.boardStage
    } else {
      template.boardStage = stage
    }
    template.updatedAt = new Date().toISOString()
  }

  /** An absent rate means "bill this task at its project's rate". */
  function updateTaskRate(templateId: ID, hourlyRate: number | undefined) {
    const template = taskTemplates.value.find((item) => item.id === templateId)
    if (!template) return

    template.hourlyRate = hourlyRate && hourlyRate > 0 ? hourlyRate : undefined
    template.updatedAt = new Date().toISOString()
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
      i18n.global.t('tasks.taskLabel')

    const removedTemplates = taskTemplates.value.filter((item) =>
      idsToRemove.has(item.id),
    )
    const removedDailyTasks = dailyTasks.value.filter(
      (item) =>
        idsToRemove.has(item.templateId) && item.date >= currentDate.value,
    )

    bury(SYNC_TABLE.TASK_TEMPLATES, removedTemplates as unknown as SyncedRow[])
    bury(SYNC_TABLE.DAILY_TASKS, removedDailyTasks as unknown as SyncedRow[])

    taskTemplates.value = taskTemplates.value.filter(
      (item) => !idsToRemove.has(item.id),
    )
    dailyTasks.value = dailyTasks.value.filter(
      (item) =>
        !idsToRemove.has(item.templateId) || item.date < currentDate.value,
    )

    const templateIds = removedTemplates.map((item) => item.id)
    const rowIds = removedDailyTasks.map((item) => item.id)

    offerUndo(
      i18n.global.t('tasks.deletedTitle', { title: removedTitle }),
      () => {
        // The buried copies come back, which also lifts the burial — so a sync
        // afterwards carries a restoration rather than a deletion.
        const templates = exhumeAll(SYNC_TABLE.TASK_TEMPLATES, templateIds)
        const rows = exhumeAll(SYNC_TABLE.DAILY_TASKS, rowIds)

        taskTemplates.value = [
          ...taskTemplates.value,
          ...(templates as unknown as TaskTemplate[]),
        ]
        dailyTasks.value = [
          ...dailyTasks.value,
          ...(rows as unknown as DailyTask[]),
        ]
      },
    )
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

  /**
   * Pausing takes effect from the next snapshot; resuming has to rebuild the
   * day straight away, or the project's tasks stay missing until a date change.
   */
  function setGoalStatus(goalId: ID, status: GoalStatus) {
    updateGoalStatus(goalId, status)
    ensureTodaySnapshot(
      taskTemplates.value,
      dailyTasks.value,
      currentDate.value,
      pausedGoalIds.value,
    )
  }

  /**
   * Deleting a project takes its tasks with it, so everything is buried with a
   * copy and the whole cascade can be undone in one go.
   */
  function removeGoal(goalId: ID) {
    const goalTitle = goals.value.find((item) => item.id === goalId)?.title

    const removedTemplates = taskTemplates.value.filter(
      (item) => item.goalId === goalId,
    )
    const removedDailyTasks = dailyTasks.value.filter(
      (item) => item.goalId === goalId,
    )

    bury(SYNC_TABLE.TASK_TEMPLATES, removedTemplates as unknown as SyncedRow[])
    bury(SYNC_TABLE.DAILY_TASKS, removedDailyTasks as unknown as SyncedRow[])

    taskTemplates.value = taskTemplates.value.filter(
      (item) => item.goalId !== goalId,
    )
    dailyTasks.value = dailyTasks.value.filter((item) => item.goalId !== goalId)
    deleteGoal(goalId)

    const templateIds = removedTemplates.map((item) => item.id)
    const rowIds = removedDailyTasks.map((item) => item.id)

    offerUndo(
      i18n.global.t('tasks.deletedTitle', {
        title: goalTitle ?? i18n.global.t('tasks.fallbackProject'),
      }),
      () => {
        const restored = restoreGoal(goalId)
        const templates = exhumeAll(SYNC_TABLE.TASK_TEMPLATES, templateIds)
        const rows = exhumeAll(SYNC_TABLE.DAILY_TASKS, rowIds)

        taskTemplates.value = [
          ...taskTemplates.value,
          ...(templates as unknown as TaskTemplate[]),
        ]
        dailyTasks.value = [
          ...dailyTasks.value,
          ...(rows as unknown as DailyTask[]),
        ]
        if (restored) selectGoal(restored.id)
      },
    )
  }

  /**
   * Puts an existing task on the calendar, or takes it off. Rows already in
   * the past keep whatever they recorded; only today onwards is rebuilt from
   * the new rule.
   */
  function updateTaskSchedule(templateId: ID, schedule: TaskSchedule | null) {
    const template = taskTemplates.value.find((item) => item.id === templateId)
    if (!template) return

    template.recurrence = schedule?.recurrence
    template.startTime = schedule?.startTime
    template.endTime = schedule?.endTime
    template.updatedAt = new Date().toISOString()

    dailyTasks.value = dailyTasks.value.filter(
      (row) =>
        row.templateId !== templateId ||
        row.date < currentDate.value ||
        row.status === TASK_STATUS.DONE,
    )

    ensureDailyTaskForTemplate({
      taskTemplates: taskTemplates.value,
      dailyTasks: dailyTasks.value,
      template,
      date: schedule?.date ?? currentDate.value,
    })

    if (!schedule) return

    const row = dailyTasks.value.find(
      (item) => item.templateId === templateId && item.date === schedule.date,
    )
    if (!row) return

    row.startTime = schedule.startTime
    row.endTime = schedule.endTime
    touchRow(row, DAILY_FIELD_GROUPS.TIME)
  }

  /** Re-stamping an unchanged row would be an edit as far as sync is concerned. */
  function scheduleDailyTask(
    dailyTaskId: ID,
    startTime: string,
    endTime: string,
  ) {
    const task = dailyTasks.value.find((item) => item.id === dailyTaskId)
    if (!task) return
    if (task.startTime === startTime && task.endTime === endTime) return

    task.startTime = startTime
    task.endTime = endTime
    touchRow(task, DAILY_FIELD_GROUPS.TIME)
  }

  function unscheduleDailyTask(dailyTaskId: ID) {
    const task = dailyTasks.value.find((item) => item.id === dailyTaskId)
    if (!task) return
    if (task.startTime === undefined && task.endTime === undefined) return

    task.startTime = undefined
    task.endTime = undefined
    touchRow(task, DAILY_FIELD_GROUPS.TIME)
  }

  function goToDate(date: ISODate) {
    currentDate.value = date
    ensureTodaySnapshot(
      taskTemplates.value,
      dailyTasks.value,
      date,
      pausedGoalIds.value,
    )
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
      touchRow(task, DAILY_FIELD_GROUPS.STATUS)
      return
    }
    task.status = TASK_STATUS.DONE
    task.completedAt = new Date().toISOString()
    touchRow(task, DAILY_FIELD_GROUPS.STATUS)

    // Finishing today's occurrence of a repeating task sends it back to To do
    // for tomorrow, rather than leaving it "In progress" from a finished day.
    const template = taskTemplates.value.find(
      (item) => item.id === task.templateId,
    )
    if (
      template?.boardStage !== undefined &&
      isRepeating(template) &&
      task.date === getTodayISODate()
    ) {
      delete template.boardStage
      template.updatedAt = task.completedAt
    }
  }

  /**
   * Hides finished cards from the board. Only `boardClearedAt` changes: no
   * row, time entry or analytic is touched, and undo restores the old value.
   */
  function clearBoardDone(templateIds: ID[]) {
    const now = new Date().toISOString()
    const previous = new Map<ID, ISODateTime | undefined>()

    templateIds.forEach((templateId) => {
      const template = taskTemplates.value.find(
        (item) => item.id === templateId,
      )
      if (!template || previous.has(templateId)) return
      previous.set(templateId, template.boardClearedAt)
      template.boardClearedAt = now
      template.updatedAt = now
    })

    if (previous.size === 0) return

    offerUndo(i18n.global.t('board.clearedDone', previous.size), () => {
      const restoredAt = new Date().toISOString()
      previous.forEach((value, templateId) => {
        const template = taskTemplates.value.find(
          (item) => item.id === templateId,
        )
        if (!template) return
        if (value === undefined) {
          delete template.boardClearedAt
        } else {
          template.boardClearedAt = value
        }
        template.updatedAt = restoredAt
      })
    })
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

  /**
   * Puts one task next to another in the list. The order is a number on each
   * row, so only the rows whose number changed are stamped, and sync carries
   * them to the other devices. Array position is not synced and is never used.
   */
  function reorderTask(
    templateId: ID,
    targetTemplateId: ID,
    placeAbove: boolean,
  ) {
    const changes = planTaskReorder(
      taskTemplates.value,
      templateId,
      targetTemplateId,
      placeAbove,
    )
    if (!changes) return

    const now = new Date().toISOString()
    changes.forEach(({ id, order }) => {
      const row = taskTemplates.value.find((item) => item.id === id)
      if (!row) return
      row.order = order
      row.updatedAt = now
    })
  }

  /** Keyboard counterpart of dragging: one place up (-1) or down (1) among the siblings. */
  function nudgeTask(templateId: ID, step: -1 | 1) {
    const plan = planTaskNudge(taskTemplates.value, templateId, step)
    if (plan) reorderTask(templateId, plan.targetId, plan.placeAbove)
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
    updateGoalDetails,
    updateGoalStatus: setGoalStatus,
    updateGoalTheme,
    updateGoalRate,
    updateGoalClient,
    updateGoalIcon,
    updateGoalBoard,
    updateGoalNotes,
    reorderGoals,
    addTask,
    addSubTask,
    editTaskTitle,
    updateTaskNotes,
    setTaskBoardStage,
    clearBoardDone,
    updateTaskRate,
    deleteTask,
    initializeStorage,
    toggleTaskDone,
    togglePlannedTask,
    convertTaskToProject,
    attachTaskToProject,
    reorderTask,
    nudgeTask,
    assignTaskToGoal,
    activeMajorTemplates,
    addMinorInAllMode,
    scheduleDailyTask,
    unscheduleDailyTask,
    updateTaskSchedule,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    goToDate,
  }
}
