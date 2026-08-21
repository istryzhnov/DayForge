import type { Goal } from '../../../entities/GoalEntity'
import type {
  DailyTask,
  TaskSchedule,
  TaskTemplate,
} from '../../../entities/TaskEntity'
import type { ID, Priority } from '../../../entities/types'
import { PRIORITY } from '../../../entities/constants'
import { useTaskTree } from '../../../composables/useTaskTree'

type GoalPanelProps = {
  goal: Goal | null
  goals: Goal[]
  tasks: DailyTask[]
  /** Every day's rows — the task tree counts completions across all of them. */
  dailyTasks: DailyTask[]
  templates: TaskTemplate[]
  newTemplateId: ID | null
  isAllMode: boolean
}

type GoalPanelActions = {
  onAddTask: (title: string, priority: Priority) => void
  onAddSubtask: (
    parentTemplateId: ID,
    title: string,
    priority: Priority,
    schedule?: TaskSchedule,
  ) => void
  onToggleDone: (dailyTaskId: ID) => void
  onCreateAllModeMinor: (
    title: string,
    goalId?: ID,
    majorId?: ID,
    schedule?: TaskSchedule,
  ) => void
  onEditTask: (templateId: ID, title: string) => void
  onDeleteTask: (templateId: ID) => void
  onSetAsProject: (templateId: ID) => void
}

export function useGoalPanelState(
  props: GoalPanelProps,
  actions: GoalPanelActions,
) {
  const taskTree = useTaskTree(props)

  function submitTask(title: string, priority: Priority) {
    actions.onAddTask(title, priority)
  }

  function submitMinor(
    title: string,
    goalId?: ID,
    majorId?: ID,
    schedule?: TaskSchedule,
  ) {
    actions.onCreateAllModeMinor(title, goalId, majorId, schedule)
  }

  function submitSubtask(
    parentTemplateId: ID,
    title: string,
    priority: Priority,
    schedule?: TaskSchedule,
  ) {
    actions.onAddSubtask(parentTemplateId, title, priority, schedule)
  }

  /**
   * The empty-state field only asks for a title, so it creates a plain task —
   * scoped to the open goal, or unassigned in All Goals.
   */
  function submitQuickAdd(title: string) {
    if (props.isAllMode) {
      actions.onCreateAllModeMinor(title)
      return
    }
    actions.onAddTask(title, PRIORITY.MINOR)
  }

  function toggleDone(dailyTaskId: ID) {
    actions.onToggleDone(dailyTaskId)
  }

  function editTask(templateId: ID, title: string) {
    actions.onEditTask(templateId, title)
  }

  function deleteTask(templateId: ID) {
    actions.onDeleteTask(templateId)
  }

  function setAsProject(templateId: ID) {
    actions.onSetAsProject(templateId)
  }

  return {
    ...taskTree,
    submitTask,
    submitMinor,
    submitSubtask,
    submitQuickAdd,
    toggleDone,
    editTask,
    deleteTask,
    setAsProject,
  }
}
