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
  onEditTask: (templateId: ID, title: string) => void
  onDeleteTask: (templateId: ID) => void
}

export function useGoalPanelState(
  props: GoalPanelProps,
  actions: GoalPanelActions,
) {
  const taskTree = useTaskTree(props)

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

  function editTask(templateId: ID, title: string) {
    actions.onEditTask(templateId, title)
  }

  function deleteTask(templateId: ID) {
    actions.onDeleteTask(templateId)
  }

  return {
    ...taskTree,
    submitTask,
    submitMinor,
    submitSubtask,
    toggleMinor,
    resolveMajor,
    editTask,
    deleteTask,
  }
}
