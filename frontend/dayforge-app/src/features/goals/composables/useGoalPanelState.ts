import { computed, ref } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type {
  DailyTask,
  TaskSchedule,
  TaskTemplate,
} from '../../../entities/TaskEntity'
import type { ID, ISODate, Priority } from '../../../entities/types'
import { useSettings } from '../../../composables/useSettings'
import { useTaskTree } from '../../../composables/useTaskTree'
import { useTheme } from '../../../composables/useTheme'
import { buildGoalThemeVars } from '../../../composables/theme/goalTheme'
import {
  useProgressMetrics,
  type ProgressScope,
} from '../../../composables/useProgressMetrics'
import { PROGRESS_SCOPE_TYPE } from '../../../entities/constants'

type GoalPanelProps = {
  goal: Goal | null
  goals: Goal[]
  tasks: DailyTask[]
  /** Every day's rows — the task tree counts completions across all of them. */
  dailyTasks: DailyTask[]
  templates: TaskTemplate[]
  newTemplateId: ID | null
  isAllMode: boolean
  currentDate: ISODate
}

type GoalPanelActions = {
  onAddTask: (
    title: string,
    priority: Priority,
    schedule?: TaskSchedule,
  ) => void
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

  // --- what the habit ring is measuring ---------------------------------

  /** Clicking a project narrows the stats to that block until it is cleared. */
  const selectedMajorDailyTaskId = ref<ID | null>(null)

  const progressScope = computed<ProgressScope>(() => {
    if (selectedMajorDailyTaskId.value) {
      return {
        type: PROGRESS_SCOPE_TYPE.MAJOR,
        majorDailyTaskId: selectedMajorDailyTaskId.value,
      }
    }

    if (!props.isAllMode && props.goal) {
      return { type: PROGRESS_SCOPE_TYPE.GOAL, goalId: props.goal.id }
    }

    return { type: PROGRESS_SCOPE_TYPE.ALL }
  })

  const { todayProgress, monthCells } = useProgressMetrics(
    computed(() => props.dailyTasks),
    computed(() => props.currentDate),
    progressScope,
  )

  const habitTitle = computed(() => {
    if (progressScope.value.type === PROGRESS_SCOPE_TYPE.MAJOR)
      return 'Project habit'
    if (progressScope.value.type === PROGRESS_SCOPE_TYPE.GOAL)
      return 'Goal habit'
    return 'All goals habit'
  })

  const habitSubtitle = computed(() => {
    if (progressScope.value.type === PROGRESS_SCOPE_TYPE.MAJOR)
      return 'Progress for selected project'
    if (progressScope.value.type === PROGRESS_SCOPE_TYPE.GOAL)
      return 'Progress for selected goal'
    return 'Progress across all goals'
  })

  function focusProject(dailyTaskId: ID | null) {
    selectedMajorDailyTaskId.value = dailyTaskId
  }

  // --- the project's own colours ----------------------------------------

  const { themeMode, surfaces } = useTheme()

  /**
   * A project's colour has to reach further than `--accent`: the task circles,
   * the frames and the habit ring all read their own tokens, so the whole set
   * is derived from the project colour and carried by the panel element.
   */
  const goalPanelStyle = computed(() => {
    if (props.isAllMode || !props.goal?.theme) return undefined
    const vars = buildGoalThemeVars(
      props.goal.theme,
      surfaces.value,
      themeMode.value,
    )
    return Object.keys(vars).length > 0 ? vars : undefined
  })

  function submitTask(
    title: string,
    priority: Priority,
    schedule?: TaskSchedule,
  ) {
    actions.onAddTask(title, priority, schedule)
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
  function submitQuickAdd(title: string, schedule?: TaskSchedule) {
    if (props.isAllMode) {
      actions.onCreateAllModeMinor(title, undefined, undefined, schedule)
      return
    }
    actions.onAddTask(
      title,
      useSettings().settings.behavior.defaultPriority,
      schedule,
    )
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
    todayProgress,
    monthCells,
    habitTitle,
    habitSubtitle,
    focusProject,
    goalPanelStyle,
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
