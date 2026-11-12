import { computed, onMounted, ref, watchEffect } from 'vue'
import type { useGoalSpace } from '../../composables/useGoalSpace'
import type { ID, ISODate, Priority } from '../../entities/types'
import type { TaskSchedule, TaskTemplate } from '../../entities/TaskEntity'
import {
  RECURRENCE_TYPE,
  TASK_STATUS,
  type BoardStage,
} from '../../entities/constants'
import type { QuickAddResult } from '../../composables/quickAdd/parse'
import { useTheme } from '../../composables/useTheme'
import { buildGoalAccentVars } from '../../composables/theme/goalTheme'
import { useTaskNotifications } from '../../composables/useTaskNotifications'
import { useSettings } from '../../composables/useSettings'
import { noteManualTaskAdded } from '../../composables/useShortcutTip'
import { setTipFacts } from '../../features/onboarding/composables/useTips'
import { tourEvent } from '../../features/onboarding/composables/useTour'
import { useToday } from '../../composables/goalSpace/today'
import { useTimer } from '../../composables/useTimer'
import { initTimerReminders } from '../../composables/useTimerReminders'
import { useTimeEntries } from '../../composables/useTimeEntries'
import { useSync } from '../../composables/useSync'
import { useDataTransfer } from '../../features/settings/composables/useDataTransfer'
import type { TaskDropPayload } from '../../features/tasks/composables/useTaskDrag'
import { provideGoalActions } from '../../features/goals/composables/useGoalActions'
import { provideTaskActions } from '../../features/tasks/composables/useTaskActions'
import { usePlannedTasks } from '../../features/tasks/composables/usePlannedTasks'
import { useArchive } from '../../features/tasks/composables/useArchive'
import { useTaskGoalDrop } from '../../features/tasks/composables/useTaskGoalDrop'
import { useProjectBilling } from '../../features/analytics/composables/useProjectBilling'
import { useFormat } from '../../composables/useFormat'
import { useUndoToast } from '../../composables/useUndoToast'
import type { ProjectBilling } from '../../features/analytics/composables/projectBilling'
import { useProjectBudget } from '../../features/analytics/composables/useProjectBudget'
import { useBudgetAlerts } from '../../features/analytics/composables/useBudgetAlerts'
import { i18n } from '../../i18n'
import { registerWorkspaceSync } from './registerWorkspaceSync'
import { useProjectSeeding } from './useProjectSeeding'
import { useTaskOptions } from './useTaskOptions'

export type ActiveView =
  'goals' | 'calendar' | 'planned' | 'archive' | 'timer' | 'analytics'

type GoalSpaceApi = ReturnType<typeof useGoalSpace>

export function useMainPageState(goalSpace: GoalSpaceApi) {
  const timeEntries = useTimeEntries()

  const { majorTaskOptions, timerTaskOptions } = useTaskOptions(goalSpace)

  const sync = useSync()

  /** Set once the stored data is in memory, so the welcome card reads real counts. */
  const dataReady = ref(false)

  onMounted(() => {
    goalSpace.initializeStorage()
    dataReady.value = true

    registerWorkspaceSync(
      sync,
      goalSpace,
      timeEntries,
      dataTransfer.buildBackup,
    )
  })

  // --- which pane is on screen -------------------------------------------

  const { settings } = useSettings()
  const activeView = ref<ActiveView>(settings.behavior.startView)

  function selectView(view: ActiveView) {
    activeView.value = view
    tourEvent('view-opened', { view })
  }

  /** Choosing a project always means "show me that project". */
  function selectGoal(goalId: ID | null) {
    activeView.value = 'goals'
    goalSpace.selectGoal(goalId)
  }

  // The contextual tips pick their card from these counts, so they follow the data.
  watchEffect(() => {
    setTipFacts({
      taskCount: goalSpace.taskTemplates.value.filter((task) => task.isActive)
        .length,
      projectCount: goalSpace.goals.value.length,
      inProject: goalSpace.activeGoalId.value !== null,
    })
  })

  const {
    showStarter,
    openStarter,
    closeStarter,
    handleApplyStarter,
    handleCreateGoal,
    createFirstProject,
    unusedProjectColor,
  } = useProjectSeeding(goalSpace, selectGoal)

  const plannedView = usePlannedTasks({
    getTemplates: () => goalSpace.taskTemplates.value,
    getDailyTasks: () => goalSpace.dailyTasks.value,
    getGoals: () => goalSpace.goals.value,
  })

  const archiveView = useArchive({
    getTemplates: () => goalSpace.taskTemplates.value,
    getDailyTasks: () => goalSpace.dailyTasks.value,
    getGoals: () => goalSpace.goals.value,
  })

  const { formatDate } = useFormat()
  const { offerNotice } = useUndoToast()

  /**
   * A task filed on another day than the one on screen would vanish from the
   * list, so say where it went and offer to jump there.
   */
  function announceScheduled(schedule: TaskSchedule | undefined) {
    if (!schedule || schedule.date === goalSpace.currentDate.value) return

    const day = formatDate(schedule.date, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
    offerNotice(
      i18n.global.t('tasks.scheduledFor', { day }),
      i18n.global.t('common.show'),
      () => goalSpace.goToDate(schedule.date),
    )
  }

  const tasksForCurrentDate = computed(() =>
    goalSpace.dailyTasks.value.filter(
      (task) => task.date === goalSpace.currentDate.value,
    ),
  )

  /** Today's rows: the calendar's Unscheduled list shows them while a later day is on screen. */
  const today = useToday()
  const todayTasks = computed(() =>
    goalSpace.dailyTasks.value.filter((task) => task.date === today.value),
  )

  // --- reminders, colours and backups ------------------------------------

  const notifications = useTaskNotifications(goalSpace.dailyTasks)
  const timer = useTimer()
  initTimerReminders(goalSpace.dailyTasks)

  /** Turns a sitting that was timed with no task attached into a real one. */
  function handleSaveTimerAsTask(title: string) {
    const created = goalSpace.addTask(
      goalSpace.activeGoalId.value ?? undefined,
      title,
      settings.behavior.defaultPriority,
    )
    if (!created) return

    timer.attachTask({
      taskId: created.id,
      goalId: created.goalId,
      taskTitle: created.title,
    })
  }

  /** Books the running sitting against a task that already exists. */
  function handleAttachTimerTask(templateId: ID) {
    const template = goalSpace.taskTemplates.value.find(
      (item: TaskTemplate) => item.id === templateId,
    )
    if (!template) return

    timer.attachTask({
      taskId: template.id,
      goalId: template.goalId,
      taskTitle: template.title,
    })
  }

  function toggleNotifications() {
    if (notifications.enabled.value) {
      notifications.disableNotifications()
      return
    }
    void notifications.enableNotifications()
  }

  const { themeMode } = useTheme()

  const goalVarsById = computed(() => {
    const result: Record<ID, Record<string, string>> = {}
    goalSpace.goals.value.forEach((goal) => {
      const vars = buildGoalAccentVars(goal.theme, themeMode.value)
      if (Object.keys(vars).length > 0) result[goal.id] = vars
    })
    return result
  })

  const dataTransfer = useDataTransfer(goalSpace)
  // Dropping a task on a sidebar project.
  useTaskGoalDrop(goalSpace)

  function handleAddTask(
    title: string,
    priority: Priority,
    schedule?: TaskSchedule,
  ) {
    if (!goalSpace.activeGoal.value) return
    const created = goalSpace.addTask(
      goalSpace.activeGoal.value.id,
      title,
      priority,
      schedule,
    )
    if (created) {
      tourEvent('task-added', {
        goalId: created.goalId,
        templateId: created.id,
        scheduled: schedule !== undefined,
      })
      if (repeats(schedule)) tourEvent('task-repeats')
    }
    announceScheduled(schedule)
    noteManualTaskAdded()
  }

  /** A schedule that repeats makes the task a habit. */
  function repeats(schedule: TaskSchedule | null | undefined): boolean {
    return (
      schedule !== undefined &&
      schedule !== null &&
      schedule.recurrence !== undefined &&
      schedule.recurrence.type !== RECURRENCE_TYPE.NONE
    )
  }

  function handleQuickAdd(result: QuickAddResult) {
    const newGoalId = result.newGoalTitle
      ? handleCreateGoal(result.newGoalTitle, '', unusedProjectColor())
      : null
    const schedule: TaskSchedule | undefined = result.date
      ? {
          date: result.date,
          recurrence: {
            type: RECURRENCE_TYPE.NONE,
            startDate: result.date,
          },
        }
      : undefined

    const created = goalSpace.addTask(
      newGoalId ?? result.goalId ?? goalSpace.activeGoalId.value ?? undefined,
      result.title,
      settings.behavior.defaultPriority,
      schedule,
    )
    if (created) {
      tourEvent('task-added', {
        goalId: created.goalId,
        templateId: created.id,
        scheduled: schedule !== undefined,
      })
      tourEvent('quick-add-used', { dated: Boolean(result.date) })
    }
    announceScheduled(schedule)
  }

  function handleAddSubTask(
    parentTemplateId: ID,
    title: string,
    priority: Priority,
    schedule?: TaskSchedule,
  ) {
    const created = goalSpace.addSubTask(
      parentTemplateId,
      title,
      priority,
      schedule,
    )
    if (created) {
      tourEvent('subtask-added', {
        parentTemplateId,
        templateId: created.id,
      })
    }
    announceScheduled(schedule)
  }

  /** No projects and no task templates: nothing to lose by showing the welcome card. */
  const isFirstRun = computed(
    () =>
      goalSpace.goals.value.length === 0 &&
      goalSpace.taskTemplates.value.length === 0,
  )

  function handleToggleDone(dailyTaskId: ID) {
    goalSpace.toggleTaskDone(dailyTaskId)
    const row = goalSpace.dailyTasks.value.find(
      (item) => item.id === dailyTaskId,
    )
    if (row?.status === TASK_STATUS.DONE) {
      tourEvent('task-done', { templateId: row.templateId })
    }
  }

  /** A dropped task changes project and position in one go. */
  function handleMoveTaskTo(payload: TaskDropPayload) {
    const template = goalSpace.taskTemplates.value.find(
      (item: TaskTemplate) => item.id === payload.templateId,
    )
    if (!template) return

    if ((template.parentTemplateId ?? null) !== payload.projectTemplateId) {
      goalSpace.attachTaskToProject(
        payload.templateId,
        payload.projectTemplateId,
      )
    }

    if (payload.targetTemplateId) {
      goalSpace.reorderTask(
        payload.templateId,
        payload.targetTemplateId,
        payload.placeAbove ?? false,
      )
    }
  }

  function handleCreateAllModeMinor(
    title: string,
    goalId?: ID,
    majorId?: ID,
    schedule?: TaskSchedule,
  ) {
    goalSpace.addMinorInAllMode(title, goalId, majorId, schedule)
    announceScheduled(schedule)
    noteManualTaskAdded()
  }

  function handleScheduleTask(templateId: ID, schedule: TaskSchedule | null) {
    goalSpace.updateTaskSchedule(templateId, schedule)
    if (repeats(schedule)) tourEvent('task-repeats')
  }

  // A timer left running on something that no longer exists would keep
  // recording against it, so it is closed out first.
  function handleDeleteTask(templateId: ID) {
    timer.handleTaskRemoved(templateId)
    goalSpace.deleteTask(templateId)
    tourEvent('task-removed', { templateId })
  }

  function handleDeleteGoal(goalId: ID) {
    timer.handleGoalRemoved(goalId)
    goalSpace.deleteGoal(goalId)
    tourEvent('project-removed', { goalId })
  }

  const projectBilling = useProjectBilling(goalSpace.goals)

  function handleChangeGoalBilling(
    goalId: ID,
    billing: ProjectBilling | undefined,
  ) {
    projectBilling.updateGoalBilling(goalId, billing)
  }

  const projectBudget = useProjectBudget(goalSpace.goals)
  // Watches tracked time and posts the 80% / 100% notices; no UI of its own.
  useBudgetAlerts(goalSpace.goals, goalSpace.taskTemplates)

  function handleChangeGoalBoard(goalId: ID, enabled: boolean) {
    goalSpace.updateGoalBoard(goalId, enabled)
    tourEvent(enabled ? 'board-shown' : 'list-shown', { goalId })
  }

  function handleSetBoardStage(templateId: ID, stage: BoardStage | undefined) {
    goalSpace.setTaskBoardStage(templateId, stage)
    tourEvent('card-moved', { templateId, stage })
  }

  /** A block drawn on the calendar belongs to no project, on the day it was drawn. */
  function handleCreateScheduledTask(payload: {
    title: string
    startTime: string
    endTime: string
    date?: ISODate
  }) {
    tourEvent('block-created')
    const date = payload.date ?? goalSpace.currentDate.value
    goalSpace.addTask(
      undefined,
      payload.title,
      settings.behavior.defaultPriority,
      {
        date,
        startTime: payload.startTime,
        endTime: payload.endTime,
        recurrence: {
          type: RECURRENCE_TYPE.NONE,
          startDate: date,
        },
      },
    )
  }

  /** A block moved to another hour, or dropped onto a later day's grid. */
  function handleScheduleCalendarBlock(payload: {
    taskId: ID
    startTime: string
    endTime: string
    date?: ISODate
  }) {
    goalSpace.scheduleDailyTaskOn(
      payload.taskId,
      payload.date ?? goalSpace.currentDate.value,
      payload.startTime,
      payload.endTime,
    )
  }

  // One object for everything the rows, cards and dialogs do to a task, so
  // none of the components between the page and them has to pass it along.
  provideTaskActions({
    addTask: handleAddTask,
    addSubtask: handleAddSubTask,
    addInAllMode: handleCreateAllModeMinor,
    toggleDone: handleToggleDone,
    togglePlanned: goalSpace.togglePlannedTask,
    editTitle: goalSpace.editTaskTitle,
    editNotes: goalSpace.updateTaskNotes,
    schedule: handleScheduleTask,
    setRate: goalSpace.updateTaskRate,
    remove: handleDeleteTask,
    setAsProject: goalSpace.convertTaskToProject,
    assignGoal: goalSpace.assignTaskToGoal,
    attachToProject: goalSpace.attachTaskToProject,
    moveTo: handleMoveTaskTo,
    nudge: goalSpace.nudgeTask,
    setBoardStage: handleSetBoardStage,
    clearBoardDone: goalSpace.clearBoardDone,
  })

  provideGoalActions({
    updateDetails: goalSpace.updateGoalDetails,
    updateStatus: goalSpace.updateGoalStatus,
    updateTheme: goalSpace.updateGoalTheme,
    updateIcon: goalSpace.updateGoalIcon,
    updateRate: goalSpace.updateGoalRate,
    updateBudget: projectBudget.updateGoalBudget,
    updateClient: goalSpace.updateGoalClient,
    setBoard: handleChangeGoalBoard,
    remove: handleDeleteGoal,
  })

  return {
    activeView,
    selectView,
    selectGoal,
    showStarter,
    openStarter,
    closeStarter,
    handleApplyStarter,
    dataReady,
    isFirstRun,
    createFirstProject,
    tasksForCurrentDate,
    todayTasks,
    goalVarsById,
    plannedTasks: plannedView.plannedTasks,
    plannedCount: plannedView.plannedCount,
    archiveDays: archiveView.days,
    totalDone: archiveView.totalDone,
    doneThisWeek: archiveView.doneThisWeek,
    doneThisMonth: archiveView.doneThisMonth,
    notificationsSupported: notifications.isSupported,
    notificationsEnabled: notifications.enabled,
    activeAlert: notifications.activeAlert,
    pendingCount: notifications.pendingCount,
    acknowledgeAlert: notifications.acknowledgeAlert,
    toggleNotifications,
    handleSaveTimerAsTask,
    handleAttachTimerTask,
    timerTaskOptions,
    dataStats: dataTransfer.stats,
    exportData: dataTransfer.exportToFile,
    importData: dataTransfer.importBackup,
    restoreSnapshot: dataTransfer.restoreSnapshot,
    clearData: dataTransfer.clearEverything,
    syncStatus: sync.status,
    handleCreateScheduledTask,
    majorTaskOptions,
    handleQuickAdd,
    handleCreateGoal,
    handleToggleDone,
    handleDeleteGoal,
    handleChangeGoalBilling,
    handleChangeGoalBoard,
    handleScheduleCalendarBlock,
  }
}
