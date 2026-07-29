import { computed, onMounted } from 'vue'
import type { useGoalSpace } from '../../composables/useGoalSpace'
import type { Goal } from '../../entities/GoalEntity'
import type { ID, Priority } from '../../entities/types'
import type { MajorDecision, MajorTaskOption } from '../../entities/TaskEntity'

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
      status: 'active',
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

  return {
    majorTaskOptions,
    handleAddTask,
    handleAddSubTask,
    handleCreateGoal,
    handleToggleMinor,
    handleResolveMajor,
    handleCreateAllModeMinor,
  }
}
