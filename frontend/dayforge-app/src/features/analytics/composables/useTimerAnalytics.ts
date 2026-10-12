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
import {
  breakdownEarnings,
  buildRateLookup,
  hasAnyRate,
  rateForTask,
} from '../../../composables/timer/rates'
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

  const showsMoney = computed(() => hasAnyRate(rateLookup.value))

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

  function projectMoneyLabel(project: ProjectTotal): string {
    return money.value.format(
      earnings.value.byProject.get(projectKeyOf(project)) ?? 0,
    )
  }

  function taskMoneyLabel(task: TaskTotal): string {
    return money.value.format(earnings.value.byTask.get(task.key) ?? 0)
  }

  function projectRateLabel(project: ProjectTotal): string {
    if (earnings.value.mixedProjects.has(projectKeyOf(project))) return 'mixed'
    const rate = rateForTask(rateLookup.value, undefined, project.goalId)
    return rate > 0 ? String(rate) : '—'
  }

  function taskRate(task: TaskTotal): number {
    return rateForTask(rateLookup.value, task.taskId, task.goalId)
  }

  const totalEarned = computed(() => earnings.value.total)

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

  const projectShares = computed<ShareInput[]>(() =>
    summary.value.byProject.map((project) => ({
      key: projectKeyOf(project),
      label: project.title,
      totalMs: project.totalMs,
    })),
  )

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
      ? ['Total', '', hours(summary.value.totalMs), '', totalEarned.value.toFixed(2)]
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
    totalLabel: computed(() => formatShortDuration(summary.value.totalMs)),
    totalHoursLabel: computed(() => hoursLabel(summary.value.totalMs)),
    totalMoneyLabel: computed(() => money.value.format(totalEarned.value)),
    durationLabel,
    hoursLabel,
    shareLabel,
    percentLabel,
    projectNameOf,
    projectRateLabel,
    projectMoneyLabel,
    taskMoneyLabel,
    barWidth,
    copyReport,
  }
}
