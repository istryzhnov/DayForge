import { computed, onMounted } from 'vue'
import type { useGoalSpace } from '../../composables/useGoalSpace'
import type { Goal, GoalTheme } from '../../entities/GoalEntity'
import type { ID, ISODate, Priority } from '../../entities/types'
import type { MajorTaskOption, TaskSchedule } from '../../entities/TaskEntity'
import { GOAL_STATUS, PRIORITY } from '../../entities/constants'
import type { StarterPlan } from '../../features/onboarding/composables/useStarterTemplate'

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

  function handleAddTask(title: string, priority: Priority) {
    if (!goalSpace.activeGoal.value) return
    goalSpace.addTask(goalSpace.activeGoal.value.id, title, priority)
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
      const created = goalSpace.addSubTask(project.id, task.title, PRIORITY.MINOR)
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

  function handleAttachToProject(
    templateId: ID,
    projectTemplateId: ID | null,
  ) {
    goalSpace.attachTaskToProject(templateId, projectTemplateId)
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

  return {
    majorTaskOptions,
    handleAddTask,
    handleAddSubTask,
    handleCreateGoal,
    handleToggleDone,
    handleTogglePlanned,
    applyStarterPlan,
    handleSetAsProject,
    handleAttachToProject,
    handleCreateAllModeMinor,
    handleEditTask,
    handleDeleteTask,
    handleDeleteGoal,
    handleChangeGoalColor,
    handleChangeGoalTheme,
  }
}
