import { computed, ref } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type {
  DailyTask,
  TaskSchedule,
  TaskTemplate,
} from '../../../entities/TaskEntity'
import type { ID, ISODate, Priority } from '../../../entities/types'
import { useTaskTree } from '../../../composables/useTaskTree'
import { useTheme } from '../../../composables/useTheme'
import { buildGoalThemeVars } from '../../../composables/theme/goalTheme'
import {
  useProgressMetrics,
  type ProgressScope,
} from '../../../composables/useProgressMetrics'
import { GOAL_STATUS, PROGRESS_SCOPE_TYPE } from '../../../entities/constants'
import { getTodayISODate } from '../../../composables/goalSpace/date'
import { panelDateLabel } from '../../../composables/panelDateLabel'
import {
  fullDayStreak,
  habitStreaks,
  habitTemplatesOf,
  habitWindowView,
} from '../../../composables/analytics/habits'
import { useTimeEntries } from '../../../composables/useTimeEntries'
import { collectUpcoming, UPCOMING_WINDOW_DAYS } from '../../tasks/composables/useUpcomingTasks'
import {
  habitWindowDays,
  monthTrackedMs,
  type PanelStats,
} from './projectPanelStats'

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

  // --- header stats: today, streak and time this month -------------------

  const { entries } = useTimeEntries()

  const goalScopeId = computed<ID | null>(() =>
    props.isAllMode || !props.goal ? null : props.goal.id,
  )

  // --- habits: the same numbers as Analytics, for this project -----------

  const habitTemplates = computed(() => {
    if (props.isAllMode || !props.goal) return props.templates
    const goalId = props.goal.id
    return props.templates.filter((template) => template.goalId === goalId)
  })

  /** Habits in scope; the Habits card is left out when there are none. */
  const hasHabits = computed(
    () => habitTemplatesOf(habitTemplates.value).length > 0,
  )

  const panelStats = computed<PanelStats>(() => ({
    todayDone: todayProgress.value.done,
    todayTotal: todayProgress.value.total,
    streakDays: hasHabits.value
      ? fullDayStreak({
          templates: habitTemplates.value,
          dailyTasks: props.dailyTasks,
          today: today.value,
        })
      : null,
    trackedMs: monthTrackedMs(entries.value, goalScopeId.value, new Date()),
  }))

  // --- upcoming: paused and archived projects do not fire their repeats ---

  const upcomingDays = computed(() => {
    const paused = new Set(
      props.goals
        .filter((goal) => goal.status !== GOAL_STATUS.ACTIVE)
        .map((goal) => goal.id),
    )
    const isLive = (goalId: ID | undefined) => !goalId || !paused.has(goalId)

    return collectUpcoming(
      props.templates.filter((template) => isLive(template.goalId)),
      props.dailyTasks.filter((row) => isLive(row.goalId)),
      props.currentDate,
      UPCOMING_WINDOW_DAYS,
      goalScopeId.value,
    )
  })

  // The habit grid stretches over the whole row when Upcoming is absent.
  const habitDays = computed(() =>
    habitWindowDays(upcomingDays.value.length > 0),
  )

  const habitWindow = computed(() =>
    habitWindowView({
      templates: habitTemplates.value,
      dailyTasks: props.dailyTasks,
      days: habitDays.value,
      today: today.value,
    }),
  )

  const habitStreakByTemplate = computed(() =>
    habitStreaks({
      templates: habitTemplates.value,
      dailyTasks: props.dailyTasks,
      today: today.value,
    }),
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

  /** The day being looked at, when it is not today; null on today. */
  const viewedDayLabel = computed(() =>
    props.currentDate === today.value
      ? null
      : panelDateLabel(props.currentDate, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }),
  )

  return {
    ...taskTree,
    panelStats,
    viewedDayLabel,
    upcomingDays,
    hasHabits,
    habitWindow,
    habitStreakByTemplate,
    focusProject,
    goalPanelStyle,
    submitTask,
    submitMinor,
    submitSubtask,
    toggleDone,
    editTask,
    editNotes,
    deleteTask,
    setAsProject,
  }
}
