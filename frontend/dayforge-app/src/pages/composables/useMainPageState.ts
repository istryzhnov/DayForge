import { computed, onMounted, ref } from 'vue'
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
  GOAL_STATUS,
  PRIORITY,
  RECURRENCE_TYPE,
} from '../../entities/constants'
import type { StarterPlan } from '../../features/onboarding/composables/useStarterTemplate'
import { useTheme } from '../../composables/useTheme'
import { buildGoalAccentVars } from '../../composables/theme/goalTheme'
import { useTaskNotifications } from '../../composables/useTaskNotifications'
import { useSettings } from '../../composables/useSettings'
import { useTimer } from '../../composables/useTimer'
import { useTimeEntries } from '../../composables/useTimeEntries'
import { useSync } from '../../composables/useSync'
import { useAuth } from '../../composables/useAuth'
import { SYNC_TABLE, type SyncedRow } from '../../sync/types'
import { useDataTransfer } from '../../features/settings/composables/useDataTransfer'
import type { TaskDropPayload } from '../../features/tasks/composables/useTaskDrag'
import { usePlannedTasks } from '../../features/tasks/composables/usePlannedTasks'
import { useArchive } from '../../features/tasks/composables/useArchive'

export type ActiveView =
  | 'goals'
  | 'calendar'
  | 'planned'
  | 'archive'
  | 'timer'
  | 'analytics'

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
          : 'All Goals') ?? 'Unknown Goal',
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

  onMounted(() => {
    goalSpace.initializeStorage()

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

  // A brand new install: nothing to look at, so explain the model instead.
  const isFirstRun = computed(
    () =>
      goalSpace.goals.value.length === 0 &&
      goalSpace.taskTemplates.value.length === 0,
  )
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

  const tasksForCurrentDate = computed(() =>
    goalSpace.dailyTasks.value.filter(
      (task) => task.date === goalSpace.currentDate.value,
    ),
  )

  // --- reminders, colours and backups ------------------------------------

  const notifications = useTaskNotifications(goalSpace.dailyTasks)
  const timer = useTimer()

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

  function handleAddTask(
    title: string,
    priority: Priority,
    schedule?: TaskSchedule,
  ) {
    if (!goalSpace.activeGoal.value) return
    goalSpace.addTask(goalSpace.activeGoal.value.id, title, priority, schedule)
  }

  function handleAddSubTask(
    parentTemplateId: ID,
    title: string,
    priority: Priority,
    schedule?: TaskSchedule,
  ) {
    goalSpace.addSubTask(parentTemplateId, title, priority, schedule)
  }

  function handleCreateGoal(title: string, description: string) {
    const now = new Date().toISOString()
    goalSpace.createGoal({
      id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      description,
      status: GOAL_STATUS.ACTIVE,
      createdAt: now,
      updatedAt: now,
    })
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
  }

  function handleEditTask(templateId: ID, title: string) {
    goalSpace.editTaskTitle(templateId, title)
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

  function handleChangeGoalIcon(goalId: ID, icon: string | undefined) {
    goalSpace.updateGoalIcon(goalId, icon)
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
    isFirstRun,
    showStarter,
    openStarter,
    closeStarter,
    handleApplyStarter,
    tasksForCurrentDate,
    goalVarsById,
    plannedTasks: plannedView.plannedTasks,
    plannedCount: plannedView.plannedCount,
    archiveBlocks: archiveView.blocks,
    totalDone: archiveView.totalDone,
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
    handleScheduleTask,
    handleDeleteTask,
    handleDeleteGoal,
    handleChangeGoalDetails,
    handleChangeGoalStatus,
    handleChangeGoalRate,
    handleChangeGoalTheme,
    handleChangeGoalIcon,
    handleSetTaskRate,
  }
}
