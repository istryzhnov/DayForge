import { ref } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { DailyTask, MajorDecision } from '../../../entities/TaskEntity'
import type { ID, Priority } from '../../../entities/types'
import { useTaskTree } from '../../../composables/useTaskTree'

type GoalPanelProps = {
  goal: Goal | null
  goals: Goal[]
  tasks: DailyTask[]
  isAllMode: boolean
}

type GoalPanelActions = {
  onAddTask: (title: string, priority: Priority) => void
  onAddSubtask: (
    parentTemplateId: ID,
    title: string,
    priority: Priority,
  ) => void
  onToggleMinor: (dailyTaskId: ID) => void
  onResolveMajor: (dailyMajorTaskId: ID, decision: MajorDecision) => void
  onCreateAllModeMinor: (title: string, goalId?: ID, majorId?: ID) => void
}

export function useGoalPanelState(
  props: GoalPanelProps,
  actions: GoalPanelActions,
) {
  const showMajorTasks = ref(true)

  const taskTree = useTaskTree(props, showMajorTasks)

  function submitTask(title: string, priority: Priority) {
    actions.onAddTask(title, priority)
  }

  function submitMinor(title: string, goalId?: ID, majorId?: ID) {
    actions.onCreateAllModeMinor(title, goalId, majorId)
  }

  function submitSubtask(
    parentTemplateId: ID,
    title: string,
    priority: Priority,
  ) {
    actions.onAddSubtask(parentTemplateId, title, priority)
  }

  function toggleMinor(dailyTaskId: ID) {
    actions.onToggleMinor(dailyTaskId)
  }

  function resolveMajor(dailyMajorTaskId: ID, decision: MajorDecision) {
    actions.onResolveMajor(dailyMajorTaskId, decision)
  }

  return {
    showMajorTasks,
    ...taskTree,
    submitTask,
    submitMinor,
    submitSubtask,
    toggleMinor,
    resolveMajor,
  }
}
