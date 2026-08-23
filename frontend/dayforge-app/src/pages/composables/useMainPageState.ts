import { computed, onMounted, ref } from 'vue'
import type { useGoalSpace } from '../../composables/useGoalSpace'
import type { Goal, GoalTheme } from '../../entities/GoalEntity'
import type { ID, ISODate, Priority } from '../../entities/types'
import type { MajorTaskOption, TaskSchedule } from '../../entities/TaskEntity'
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
import { useDataTransfer } from '../../features/settings/composables/useDataTransfer'
import { usePlannedTasks } from '../../features/tasks/composables/usePlannedTasks'
import { useArchive } from '../../features/tasks/composables/useArchive'

export type ActiveView = 'goals' | 'calendar' | 'planned' | 'archive'

type GoalSpaceApi = ReturnType<typeof useGoalSpace>

export function useMainPageState(goalSpace: GoalSpaceApi) {
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

  onMounted(() => {
    goalSpace.initializeStorage()
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

  function toggleNotifications() {
    if (notifications.enabled.value) {
      notifications.disableNotifications()
      return
    }
    void notifications.enableNotifications()
  }

  const { themeMode } = useTheme()

  /**
   * A project's colour has to travel with its tasks outside its own panel — the
   * sidebar row and the calendar blocks belong to shared chrome, so they take
   * the accent-only variant that leaves surrounding surfaces alone.
   */
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

  /**
   * Turn a starter answer set into a real first day.
   *
   * The blocks are created as ordinary open tasks and then placed on the
   * calendar, rather than as dated one-offs: a one-off would file itself under
   * Planned tasks, and these are today's work, not appointments. Being open
   * also means anything left unfinished follows the user forward.
   */
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

  function handleDeleteTask(templateId: ID) {
    goalSpace.deleteTask(templateId)
  }

  function handleDeleteGoal(goalId: ID) {
    goalSpace.deleteGoal(goalId)
  }

  function handleChangeGoalColor(goalId: ID, color: string | undefined) {
    goalSpace.updateGoalColor(goalId, color)
  }

  function handleChangeGoalTheme(goalId: ID, theme: GoalTheme | undefined) {
    goalSpace.updateGoalTheme(goalId, theme)
  }

  /**
   * Drawn straight onto the calendar grid, so it is dated to the day in view
   * and inherits the configured default kind.
   */
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
    dataStats: dataTransfer.stats,
    exportData: dataTransfer.exportToFile,
    importData: dataTransfer.importBackup,
    clearData: dataTransfer.clearEverything,
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
    handleAssignTaskToGoal,
    handleCreateAllModeMinor,
    handleEditTask,
    handleDeleteTask,
    handleDeleteGoal,
    handleChangeGoalColor,
    handleChangeGoalTheme,
  }
}
