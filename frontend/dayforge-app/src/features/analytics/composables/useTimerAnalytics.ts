import { computed, ref } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { DailyTask, TaskTemplate } from '../../../entities/TaskEntity'
import type { ID } from '../../../entities/types'
import { useSettings } from '../../../composables/useSettings'
import { useTimeEntries } from '../../../composables/useTimeEntries'
import { formatShortDuration } from '../../../composables/timer/format'
import { getTodayISODate } from '../../../composables/goalSpace/date'
import {
  ANALYTICS_PERIOD,
  NO_PROJECT_KEY,
  entriesInRange,
  periodDateBounds,
  periodRange,
  summarize,
  type AnalyticsPeriod,
  type ProjectTotal,
} from '../../../composables/timer/analytics'
import { projectColors } from '../../../composables/theme/goalTheme'
import {
  breakdownEarnings,
  buildRateLookup,
  hasAnyRate,
  rateForTask,
} from '../../../composables/timer/rates'
import {
  projectFigures,
  sanitizeBilling,
  type ProjectBilling,
  type ProjectFigures,
} from './projectBilling'
import {
  SERIES_GRANULARITY,
  buildSeries,
  type ShareInput,
} from '../../../composables/analytics/charts'
import { habitStats } from '../../../composables/analytics/habits'
import {
  totalsByDay,
  type TaskTotal,
} from '../../../composables/timer/entries'

export const PERIOD_OPTIONS: { id: AnalyticsPeriod; label: string }[] = [
  { id: ANALYTICS_PERIOD.THIS_MONTH, label: 'This month' },
  { id: ANALYTICS_PERIOD.LAST_MONTH, label: 'Last month' },
  { id: ANALYTICS_PERIOD.THIS_WEEK, label: 'This week' },
  { id: ANALYTICS_PERIOD.ALL, label: 'All time' },
]

const HOUR_MS = 60 * 60 * 1000

export interface ProjectRow {
  /** Same key the earnings maps use: the goal id, or the no-project key. */
  key: string
  goalId?: ID
  title: string
  color?: string
  taskCount: number
  /** Tracked over all time, shown for reference next to manual hours. */
  trackedMs: number
  /** Only live projects can be edited; deleted ones keep their history. */
  editable: boolean
  billing?: ProjectBilling
  figures: ProjectFigures
}

export interface AnalyticsSources {
  getGoals: () => Goal[]
  getTemplates: () => TaskTemplate[]
  /** Every day's rows, which is what repetitions and streaks are counted from. */
  getDailyTasks: () => DailyTask[]
}

export function useTimerAnalytics(sources: AnalyticsSources) {
  const { entries } = useTimeEntries()
  const { settings } = useSettings()

  const period = ref<AnalyticsPeriod>(ANALYTICS_PERIOD.THIS_MONTH)

  const goalTitleById = computed(
    () =>
      new Map<ID, string>(
        sources.getGoals().map((goal) => [goal.id, goal.title]),
      ),
  )

  const range = computed(() => periodRange(period.value, new Date()))
  const inRange = computed(() => entriesInRange(entries.value, range.value))

  const summary = computed(() => summarize(inRange.value, goalTitleById.value))

  const defaultRate = computed(() => settings.timer.hourlyRate)

  /** Looked up live, so changing a rate re-prices history immediately. */
  const rateLookup = computed(() =>
    buildRateLookup(
      sources.getTemplates(),
      sources.getGoals(),
      defaultRate.value,
    ),
  )

  const earnings = computed(() =>
    breakdownEarnings(inRange.value, rateLookup.value),
  )

  const isAllTime = computed(() => period.value === ANALYTICS_PERIOD.ALL)

  const allTimeSummary = computed(() =>
    summarize(entries.value, goalTitleById.value),
  )

  const allTimeEarnings = computed(() =>
    breakdownEarnings(entries.value, rateLookup.value),
  )

  const hasFixedPrice = computed(() =>
    sources.getGoals().some((goal) => goal.billing?.fixedPrice !== undefined),
  )

  const showsMoney = computed(
    () => hasAnyRate(rateLookup.value) || hasFixedPrice.value,
  )

  const money = computed(
    () =>
      new Intl.NumberFormat(settings.format.locale, {
        style: 'currency',
        currency: settings.timer.currency,
        maximumFractionDigits: 2,
      }),
  )

  const rateNote = computed(() => {
    const { byGoal, byTask } = rateLookup.value
    const base =
      defaultRate.value > 0
        ? `${defaultRate.value} per hour by default`
        : 'no default rate'

    const overrides: string[] = []
    if (byGoal.size > 0) overrides.push(`${byGoal.size} project`)
    if (byTask.size > 0) overrides.push(`${byTask.size} task`)
    if (overrides.length === 0) return base

    const count = byGoal.size + byTask.size
    return `${base} · ${overrides.join(' and ')} ${
      count === 1 ? 'override' : 'overrides'
    }`
  })

  function projectKeyOf(project: ProjectTotal): string {
    return project.goalId ?? NO_PROJECT_KEY
  }

  /**
   * One row per project with time in the period. In All time every live
   * project gets a row too, so a project worked on without the timer can
   * still be given its hours or fixed price.
   */
  const projectRows = computed<ProjectRow[]>(() => {
    const goals = sources.getGoals()
    const colors = projectColors(goals)
    const goalById = new Map(goals.map((goal) => [goal.id, goal]))

    const periodByKey = new Map(
      summary.value.byProject.map((project) => [projectKeyOf(project), project]),
    )
    const allByKey = new Map(
      allTimeSummary.value.byProject.map((project) => [
        projectKeyOf(project),
        project,
      ]),
    )

    const keys = new Set(periodByKey.keys())
    if (isAllTime.value) goals.forEach((goal) => keys.add(goal.id))

    const rows = [...keys].map((key): ProjectRow => {
      const goal = goalById.get(key)
      const inPeriod = periodByKey.get(key)
      const overAll = allByKey.get(key)
      const billing = sanitizeBilling(goal?.billing)

      const figures = projectFigures({
        periodMs: inPeriod?.totalMs ?? 0,
        periodEarned: earnings.value.byProject.get(key) ?? 0,
        allTimeMs: overAll?.totalMs ?? 0,
        allTimeEarned: allTimeEarnings.value.byProject.get(key) ?? 0,
        fallbackRate: rateForTask(rateLookup.value, undefined, goal?.id),
        isAllTime: isAllTime.value,
        billing,
      })

      return {
        key,
        goalId: goal?.id,
        title:
          goal?.title ??
          inPeriod?.title ??
          overAll?.title ??
          'Without a project',
        color: goal ? colors.get(goal.id) : undefined,
        taskCount: inPeriod?.taskCount ?? 0,
        trackedMs: overAll?.totalMs ?? 0,
        editable: goal !== undefined,
        billing,
        figures,
      }
    })

    return rows.sort(
      (a, b) =>
        b.figures.ms - a.figures.ms || a.title.localeCompare(b.title),
    )
  })

  const adjustedTotalMs = computed(() =>
    projectRows.value.reduce((sum, row) => sum + row.figures.ms, 0),
  )

  const adjustedTotalEarned = computed(() =>
    projectRows.value.reduce((sum, row) => sum + row.figures.earned, 0),
  )

  const hasAdjustments = computed(() =>
    projectRows.value.some(
      (row) => row.figures.fixedBasis !== null || row.figures.manualHours,
    ),
  )

  function moneyLabel(value: number): string {
    return money.value.format(value)
  }

  function effectiveRateLabel(rate: number | null): string {
    return rate === null ? '—' : money.value.format(rate)
  }

  function taskMoneyLabel(task: TaskTotal): string {
    return money.value.format(earnings.value.byTask.get(task.key) ?? 0)
  }

  function taskRate(task: TaskTotal): number {
    return rateForTask(rateLookup.value, task.taskId, task.goalId)
  }

  function durationLabel(totalMs: number): string {
    return formatShortDuration(totalMs)
  }

  function hoursLabel(totalMs: number): string {
    return `${(totalMs / HOUR_MS).toFixed(2)} h`
  }

  function shareLabel(totalMs: number): string {
    const total = summary.value.totalMs
    if (total === 0) return '0%'
    return `${Math.round((totalMs / total) * 100)}%`
  }

  /** Share of the adjusted total, so the project column adds up to 100%. */
  function projectShareLabel(totalMs: number): string {
    if (adjustedTotalMs.value === 0) return '0%'
    return `${Math.round((totalMs / adjustedTotalMs.value) * 100)}%`
  }

  function barWidth(totalMs: number): string {
    const longest = summary.value.byTask[0]?.totalMs ?? 0
    if (longest === 0) return '0%'
    return `${Math.max(2, (totalMs / longest) * 100)}%`
  }

  // --- charts --------------------------------------------------------------

  const bounds = computed(() =>
    periodDateBounds(range.value, entries.value, getTodayISODate()),
  )

  const daySeries = computed(() =>
    buildSeries(totalsByDay(inRange.value), bounds.value.from, bounds.value.to),
  )

  const seriesCaption = computed(() =>
    daySeries.value.granularity === SERIES_GRANULARITY.WEEK
      ? 'Tracked hours per week'
      : 'Tracked hours per day',
  )

  const projectShares = computed<ShareInput[]>(() => {
    const colors = projectColors(sources.getGoals())
    return summary.value.byProject.map((project) => ({
      key: projectKeyOf(project),
      label: project.title,
      totalMs: project.totalMs,
      color: project.goalId ? colors.get(project.goalId) : undefined,
    }))
  })

  // --- habits --------------------------------------------------------------

  const habits = computed(() =>
    habitStats({
      templates: sources.getTemplates(),
      dailyTasks: sources.getDailyTasks(),
      from: bounds.value.from,
      to: bounds.value.to,
      today: getTodayISODate(),
    }),
  )

  function percentLabel(fraction: number): string {
    return `${Math.round(fraction * 100)}%`
  }

  function projectNameOf(goalId?: ID): string {
    if (!goalId) return '—'
    return goalTitleById.value.get(goalId) ?? 'Deleted project'
  }

  // --- the report ----------------------------------------------------------

  function hours(totalMs: number): string {
    return (totalMs / HOUR_MS).toFixed(2)
  }

  function taskRows(): string[] {
    const header = showsMoney.value
      ? ['Task', 'Project', 'Hours', 'Rate / h', 'Earned']
      : ['Task', 'Project', 'Hours']

    const rows = summary.value.byTask.map((task) => {
      const base = [task.title, projectNameOf(task.goalId), hours(task.totalMs)]
      if (!showsMoney.value) return base.join('\t')
      return [
        ...base,
        String(taskRate(task)),
        (earnings.value.byTask.get(task.key) ?? 0).toFixed(2),
      ].join('\t')
    })

    const total = showsMoney.value
      ? ['Total', '', hours(summary.value.totalMs), '', earnings.value.total.toFixed(2)]
      : ['Total', '', hours(summary.value.totalMs)]

    return [header.join('\t'), ...rows, total.join('\t')]
  }

  function habitRows(): string[] {
    if (habits.value.length === 0) return []

    return [
      '',
      ['Repeating task', 'Project', 'Done', 'Of', 'Rate', 'Streak'].join('\t'),
      ...habits.value.map((habit) =>
        [
          habit.title,
          projectNameOf(habit.goalId),
          String(habit.completed),
          String(habit.expected),
          percentLabel(habit.completionRate),
          String(habit.currentStreak),
        ].join('\t'),
      ),
    ]
  }

  function dayRows(): string[] {
    const worked = daySeries.value.points.filter((point) => point.totalMs > 0)
    if (worked.length === 0) return []

    return [
      '',
      [
        daySeries.value.granularity === SERIES_GRANULARITY.WEEK
          ? 'Week of'
          : 'Day',
        'Hours',
      ].join('\t'),
      ...worked.map((point) => [point.date, hours(point.totalMs)].join('\t')),
    ]
  }

  /** Tab-separated, so it pastes straight into a sheet or an invoice. */
  function buildReport(): string {
    return [...taskRows(), ...habitRows(), ...dayRows()].join('\n')
  }

  const copied = ref(false)
  let copiedResetId: number | undefined

  /** The async API is refused in some contexts, hence the textarea fallback. */
  function copyViaTextarea(text: string): boolean {
    const field = document.createElement('textarea')
    field.value = text
    field.style.position = 'fixed'
    field.style.opacity = '0'
    document.body.append(field)
    field.select()

    try {
      return document.execCommand('copy')
    } catch {
      return false
    } finally {
      field.remove()
    }
  }

  async function copyReport() {
    const report = buildReport()
    let done = false

    try {
      await navigator.clipboard.writeText(report)
      done = true
    } catch {
      done = copyViaTextarea(report)
    }

    if (!done) return

    copied.value = true
    window.clearTimeout(copiedResetId)
    copiedResetId = window.setTimeout(() => {
      copied.value = false
    }, 2000)
  }

  return {
    period,
    summary,
    showsMoney,
    defaultRate,
    rateNote,
    copied,
    habits,
    daySeries,
    seriesCaption,
    projectShares,
    periodLabel: computed(
      () =>
        PERIOD_OPTIONS.find((option) => option.id === period.value)?.label ??
        '',
    ),
    hasAdjustments,
    projectRows,
    projectShareLabel,
    totalLabel: computed(() => formatShortDuration(adjustedTotalMs.value)),
    totalHoursLabel: computed(() => hoursLabel(adjustedTotalMs.value)),
    totalMoneyLabel: computed(() => moneyLabel(adjustedTotalEarned.value)),
    durationLabel,
    hoursLabel,
    shareLabel,
    percentLabel,
    projectNameOf,
    moneyLabel,
    effectiveRateLabel,
    taskMoneyLabel,
    barWidth,
    copyReport,
  }
}
