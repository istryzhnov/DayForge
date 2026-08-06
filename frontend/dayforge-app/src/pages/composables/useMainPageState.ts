import { computed, onMounted } from 'vue'
import type { useGoalSpace } from '../../composables/useGoalSpace'
import type { Goal } from '../../entities/GoalEntity'
import type { ID, Priority } from '../../entities/types'
import type { MajorDecision, MajorTaskOption } from '../../entities/TaskEntity'
import { GOAL_STATUS } from '../../entities/constants'

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
  ) {
    goalSpace.addSubTask(parentTemplateId, title, priority)
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

  function handleToggleMinor(dailyTaskId: ID) {
    goalSpace.toggleMinorDone(dailyTaskId)
  }

  function handleResolveMajor(dailyMajorTaskId: ID, decision: MajorDecision) {
    goalSpace.resolveMajorTask(dailyMajorTaskId, decision)
  }

  function handleCreateAllModeMinor(title: string, goalId?: ID, majorId?: ID) {
    goalSpace.addMinorInAllMode(title, goalId, majorId)
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

  return {
    majorTaskOptions,
    handleAddTask,
    handleAddSubTask,
    handleCreateGoal,
    handleToggleMinor,
    handleResolveMajor,
    handleCreateAllModeMinor,
    handleEditTask,
    handleDeleteTask,
    handleDeleteGoal,
    handleChangeGoalColor,
  }
}
