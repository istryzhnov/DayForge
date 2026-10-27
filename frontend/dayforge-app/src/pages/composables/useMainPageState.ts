import { computed, onMounted, ref, watchEffect } from 'vue'
import type { useGoalSpace } from '../../composables/useGoalSpace'
import type { Goal, GoalTheme } from '../../entities/GoalEntity'
import type { GoalStatus, ID, ISODate, Priority } from '../../entities/types'
import type {
  DailyTask,
  MajorTaskOption,
  TaskSchedule,
  TaskTemplate,
} from '../../entities/TaskEntity'
import type { TimeEntry } from '../../entities/TimerEntity'
import {
  GOAL_COLOR_PRESETS,
  GOAL_STATUS,
  PRIORITY,
  RECURRENCE_TYPE,
  type BoardStage,
} from '../../entities/constants'
import type { QuickAddResult } from '../../composables/quickAdd/parse'
import type { StarterPlan } from '../../features/onboarding/composables/useStarterTemplate'
import { useTheme } from '../../composables/useTheme'
import { buildGoalAccentVars } from '../../composables/theme/goalTheme'
import { useTaskNotifications } from '../../composables/useTaskNotifications'
import { useSettings } from '../../composables/useSettings'
import { noteManualTaskAdded } from '../../composables/useShortcutTip'
import { setTipFacts } from '../../features/onboarding/composables/useTips'
import { useTimer } from '../../composables/useTimer'
import { initTimerReminders } from '../../composables/useTimerReminders'
import { useTimeEntries } from '../../composables/useTimeEntries'
import { useSync } from '../../composables/useSync'
import { useAuth } from '../../composables/useAuth'
import { SYNC_TABLE, type SyncedRow } from '../../sync/types'
import { useDataTransfer } from '../../features/settings/composables/useDataTransfer'
import type { TaskDropPayload } from '../../features/tasks/composables/useTaskDrag'
import { usePlannedTasks } from '../../features/tasks/composables/usePlannedTasks'
import { useArchive } from '../../features/tasks/composables/useArchive'
import { useTaskGoalDrop } from '../../features/tasks/composables/useTaskGoalDrop'
import { useProjectBilling } from '../../features/analytics/composables/useProjectBilling'
import { useFormat } from '../../composables/useFormat'
import { useUndoToast } from '../../composables/useUndoToast'
import type { ProjectBilling } from '../../features/analytics/composables/projectBilling'
import { useProjectBudget } from '../../features/analytics/composables/useProjectBudget'
import type { ProjectBudget } from '../../features/analytics/composables/projectBudget'
import { useBudgetAlerts } from '../../features/analytics/composables/useBudgetAlerts'

export type ActiveView =
  'goals' | 'calendar' | 'planned' | 'archive' | 'timer' | 'analytics'

type GoalSpaceApi = ReturnType<typeof useGoalSpace>

export function useMainPageState(goalSpace: GoalSpaceApi) {
  const timeEntries = useTimeEntries()
  const auth = useAuth()

  const majorTaskOptions = computed<MajorTaskOption[]>(() =>
    goalSpace.activeMajorTemplates.value.map((template) => ({
      id: template.id,
      title: template.title,
      goalId: template.goalId,
      goalTitle:
        (template.goalId
          ? goalSpace.goals.value.find(
              (goal: Goal) => goal.id === template.goalId,
            )?.title
          : 'All Tasks') ?? 'Unknown Goal',
    })),
  )

  /** Everything the timer can book time against, projects and tasks alike. */
  const timerTaskOptions = computed<MajorTaskOption[]>(() =>
    goalSpace.taskTemplates.value
      .filter((template: TaskTemplate) => template.isActive)
      .map((template: TaskTemplate) => ({
        id: template.id,
        title: template.title,
        goalId: template.goalId,
        goalTitle:
          (template.goalId
            ? goalSpace.goals.value.find(
                (goal: Goal) => goal.id === template.goalId,
              )?.title
            : 'No project') ?? 'No project',
      })),
  )

  const sync = useSync()

  /** Set once the stored data is in memory, so the welcome card reads real counts. */
  const dataReady = ref(false)

  onMounted(() => {
    goalSpace.initializeStorage()
    dataReady.value = true

    // Registering the arrays is the whole of it: from here the engine watches
    // them, queues what actually changed and sends it when it can.
    sync.register(
      [
        {
          table: SYNC_TABLE.GOALS,
          track: () => goalSpace.goals.value,
          read: () => goalSpace.goals.value as unknown as SyncedRow[],
          write: (rows) => goalSpace.setGoals(rows as unknown as Goal[]),
        },
        {
          table: SYNC_TABLE.TASK_TEMPLATES,
          track: () => goalSpace.taskTemplates.value,
          read: () => goalSpace.taskTemplates.value as unknown as SyncedRow[],
          write: (rows) => {
            goalSpace.taskTemplates.value = rows as unknown as TaskTemplate[]
          },
        },
        {
          table: SYNC_TABLE.DAILY_TASKS,
          track: () => goalSpace.dailyTasks.value,
          read: () => goalSpace.dailyTasks.value as unknown as SyncedRow[],
          write: (rows) => {
            goalSpace.dailyTasks.value = rows as unknown as DailyTask[]
          },
        },
        {
          table: SYNC_TABLE.TIME_ENTRIES,
          track: () => timeEntries.entries.value,
          read: () => timeEntries.entries.value as unknown as SyncedRow[],
          write: (rows) => {
            timeEntries.entries.value = rows as unknown as TimeEntry[]
          },
        },
      ],
      dataTransfer.buildBackup,
    )
  })

  // --- which pane is on screen -------------------------------------------

  const { settings } = useSettings()
  const activeView = ref<ActiveView>(settings.behavior.startView)

  function selectView(view: ActiveView) {
    activeView.value = view
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

  const showStarter = ref(false)

  function openStarter() {
    showStarter.value = true
  }

  function closeStarter() {
    showStarter.value = false
  }

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
    offerNotice(`Scheduled for ${day}`, 'Show', () =>
      goalSpace.goToDate(schedule.date),
    )
  }

  const tasksForCurrentDate = computed(() =>
    goalSpace.dailyTasks.value.filter(
      (task) => task.date === goalSpace.currentDate.value,
    ),
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
    goalSpace.addTask(goalSpace.activeGoal.value.id, title, priority, schedule)
    announceScheduled(schedule)
    noteManualTaskAdded()
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

    goalSpace.addTask(
      newGoalId ?? result.goalId ?? goalSpace.activeGoalId.value ?? undefined,
      result.title,
      settings.behavior.defaultPriority,
      schedule,
    )
    announceScheduled(schedule)
  }

  function handleAddSubTask(
    parentTemplateId: ID,
    title: string,
    priority: Priority,
    schedule?: TaskSchedule,
  ) {
    goalSpace.addSubTask(parentTemplateId, title, priority, schedule)
    announceScheduled(schedule)
  }

  /** The first preset no project is wearing yet, so a new one stands out. */
  function unusedProjectColor(): string {
    const used = new Set(
      goalSpace.goals.value.map((goal) => goal.theme?.accent?.toLowerCase()),
    )
    return (
      GOAL_COLOR_PRESETS.find((color) => !used.has(color.toLowerCase())) ??
      GOAL_COLOR_PRESETS[0]
    )
  }

  /** No projects and no task templates: nothing to lose by showing the welcome card. */
  const isFirstRun = computed(
    () =>
      goalSpace.goals.value.length === 0 &&
      goalSpace.taskTemplates.value.length === 0,
  )

  /** The welcome card's project. It opens only when the user plans their day. */
  function createFirstProject(title: string, color: string, select: boolean) {
    const id = handleCreateGoal(title, '', color)
    if (select) selectGoal(id)
  }

  function handleCreateGoal(
    title: string,
    description: string,
    color: string,
  ): ID {
    const now = new Date().toISOString()
    const id = `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    goalSpace.createGoal({
      id,
      title,
      description,
      status: GOAL_STATUS.ACTIVE,
      createdAt: now,
      updatedAt: now,
      theme: { accent: color },
    })
    return id
  }

  function handleToggleDone(dailyTaskId: ID) {
    goalSpace.toggleTaskDone(dailyTaskId)
  }

  function applyStarterPlan(plan: StarterPlan) {
    const now = new Date().toISOString()
    const goalId = `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    goalSpace.createGoal({
      id: goalId,
      title: plan.goalTitle,
      description: plan.goalDescription,
      status: GOAL_STATUS.ACTIVE,
      createdAt: now,
      updatedAt: now,
    })
    goalSpace.selectGoal(goalId)

    const project = goalSpace.addTask(goalId, plan.projectTitle, PRIORITY.MINOR)
    if (!project) return

    plan.tasks.forEach((task) => {
      const created = goalSpace.addSubTask(
        project.id,
        task.title,
        PRIORITY.MINOR,
      )
      if (!created) return

      const row = goalSpace.dailyTasks.value.find(
        (item) =>
          item.templateId === created.id &&
          item.date === goalSpace.currentDate.value,
      )
      if (row) {
        goalSpace.scheduleDailyTask(row.id, task.startTime, task.endTime)
      }
    })
  }

  function handleTogglePlanned(templateId: ID, date: ISODate) {
    goalSpace.togglePlannedTask(templateId, date)
  }

  function handleSetAsProject(templateId: ID) {
    goalSpace.convertTaskToProject(templateId)
  }

  function handleAttachToProject(templateId: ID, projectTemplateId: ID | null) {
    goalSpace.attachTaskToProject(templateId, projectTemplateId)
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

  function handleAssignTaskToGoal(templateId: ID, goalId: ID | undefined) {
    goalSpace.assignTaskToGoal(templateId, goalId)
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

  function handleEditTask(templateId: ID, title: string) {
    goalSpace.editTaskTitle(templateId, title)
  }

  function handleEditNotes(templateId: ID, notes: string) {
    goalSpace.updateTaskNotes(templateId, notes)
  }

  // A timer left running on something that no longer exists would keep
  // recording against it, so it is closed out first.
  function handleScheduleTask(templateId: ID, schedule: TaskSchedule | null) {
    goalSpace.updateTaskSchedule(templateId, schedule)
  }

  function handleDeleteTask(templateId: ID) {
    timer.handleTaskRemoved(templateId)
    goalSpace.deleteTask(templateId)
  }

  function handleDeleteGoal(goalId: ID) {
    timer.handleGoalRemoved(goalId)
    goalSpace.deleteGoal(goalId)
  }

  function handleChangeGoalDetails(
    goalId: ID,
    title: string,
    description: string,
  ) {
    goalSpace.updateGoalDetails(goalId, title, description)
  }

  /** Archiving the open project keeps it selected, so it can be brought back. */
  function handleChangeGoalStatus(goalId: ID, status: GoalStatus) {
    goalSpace.updateGoalStatus(goalId, status)
  }

  function handleChangeGoalRate(goalId: ID, hourlyRate: number | undefined) {
    goalSpace.updateGoalRate(goalId, hourlyRate)
  }

  function handleChangeGoalClient(goalId: ID, clientId: ID | undefined) {
    goalSpace.updateGoalClient(goalId, clientId)
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

  function handleChangeGoalBudget(
    goalId: ID,
    budget: ProjectBudget | undefined,
  ) {
    projectBudget.updateGoalBudget(goalId, budget)
  }

  function handleChangeGoalIcon(goalId: ID, icon: string | undefined) {
    goalSpace.updateGoalIcon(goalId, icon)
  }

  function handleChangeGoalBoard(goalId: ID, enabled: boolean) {
    goalSpace.updateGoalBoard(goalId, enabled)
  }

  function handleChangeGoalNotes(goalId: ID, notes: string) {
    goalSpace.updateGoalNotes(goalId, notes)
  }

  function handleSetBoardStage(templateId: ID, stage: BoardStage | undefined) {
    goalSpace.setTaskBoardStage(templateId, stage)
  }

  function handleClearBoardDone(templateIds: ID[]) {
    goalSpace.clearBoardDone(templateIds)
  }

  function handleChangeGoalTheme(goalId: ID, theme: GoalTheme | undefined) {
    goalSpace.updateGoalTheme(goalId, theme)
  }

  function handleSetTaskRate(templateId: ID, hourlyRate: number | undefined) {
    goalSpace.updateTaskRate(templateId, hourlyRate)
  }

  function handleCreateScheduledTask(payload: {
    title: string
    startTime: string
    endTime: string
  }) {
    goalSpace.addTask(
      goalSpace.activeGoalId.value ?? undefined,
      payload.title,
      settings.behavior.defaultPriority,
      {
        date: goalSpace.currentDate.value,
        startTime: payload.startTime,
        endTime: payload.endTime,
        recurrence: {
          type: RECURRENCE_TYPE.NONE,
          startDate: goalSpace.currentDate.value,
        },
      },
    )
  }

  function handleApplyStarter(plan: StarterPlan) {
    applyStarterPlan(plan)
    closeStarter()
  }

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
    syncSnapshots: sync.snapshots,
    retrySync: sync.retryDead,
    discardSyncFailures: sync.discardDead,
    auth,
    handleCreateScheduledTask,
    majorTaskOptions,
    handleAddTask,
    handleQuickAdd,
    handleAddSubTask,
    handleCreateGoal,
    handleToggleDone,
    handleTogglePlanned,
    applyStarterPlan,
    handleSetAsProject,
    handleAttachToProject,
    handleMoveTaskTo,
    handleAssignTaskToGoal,
    handleCreateAllModeMinor,
    handleEditTask,
    handleEditNotes,
    handleScheduleTask,
    handleDeleteTask,
    handleDeleteGoal,
    handleChangeGoalDetails,
    handleChangeGoalStatus,
    handleChangeGoalRate,
    handleChangeGoalClient,
    handleChangeGoalBilling,
    handleChangeGoalTheme,
    handleChangeGoalIcon,
    handleChangeGoalBudget,
    handleChangeGoalBoard,
    handleChangeGoalNotes,
    handleSetBoardStage,
    handleClearBoardDone,
    handleSetTaskRate,
  }
}
