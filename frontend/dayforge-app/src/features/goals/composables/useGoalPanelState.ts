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
import {
  getTodayISODate,
  startOfMonthISODate,
} from '../../../composables/goalSpace/date'
import { habitMonthView } from '../../../composables/analytics/habits'

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
  onEditNotes: (templateId: ID, notes: string) => void
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

  // "Today" is the real date, not the day the app is viewing.
  const today = computed(() => getTodayISODate())

  const { todayProgress } = useProgressMetrics(
    computed(() => props.dailyTasks),
    today,
    progressScope,
  )

  const todayScopeLabel = computed(() => {
    if (progressScope.value.type === PROGRESS_SCOPE_TYPE.MAJOR)
      return 'Selected block, all tasks today'
    if (progressScope.value.type === PROGRESS_SCOPE_TYPE.GOAL)
      return 'This project, all tasks today'
    return 'All tasks today'
  })

  // --- habits: the same numbers as Analytics, for this project -----------

  const habitTemplates = computed(() => {
    if (props.isAllMode || !props.goal) return props.templates
    const goalId = props.goal.id
    return props.templates.filter((template) => template.goalId === goalId)
  })

  const habitView = computed(() =>
    habitMonthView({
      templates: habitTemplates.value,
      dailyTasks: props.dailyTasks,
      month: startOfMonthISODate(props.currentDate),
      today: today.value,
    }),
  )

  const habitSubtitle = computed(() =>
    props.isAllMode || !props.goal
      ? 'Repeating tasks across all projects'
      : 'Repeating tasks in this project',
  )

  function focusProject(dailyTaskId: ID | null) {
    selectedMajorDailyTaskId.value = dailyTaskId
  }

  // --- the project's own colours ----------------------------------------

  const { themeMode, surfaces } = useTheme()

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

  function editNotes(templateId: ID, notes: string) {
    actions.onEditNotes(templateId, notes)
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
    todayScopeLabel,
    habitView,
    habitSubtitle,
    focusProject,
    goalPanelStyle,
    submitTask,
    submitMinor,
    submitSubtask,
    submitQuickAdd,
    toggleDone,
    editTask,
    editNotes,
    deleteTask,
    setAsProject,
  }
}
