<script setup lang="ts">
import { computed } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { DailyTask, TaskTemplate } from '../../../entities/TaskEntity'
import type { AnalyticsPeriod, ProjectTotal } from '../../../composables/timer/analytics'
import { getTodayISODate } from '../../../composables/goalSpace/date'
import { formatHoursMinutes } from '../../../composables/timer/format'
import { useSettings } from '../../../composables/useSettings'
import { useTimeEntries } from '../../../composables/useTimeEntries'
import {
  PLAN_STATE,
  earliestPlanDate,
  planBounds,
  planVsActual,
  plannedMsByProject,
  type PlanState,
} from '../composables/planVsActual'

const props = defineProps<{
  period: AnalyticsPeriod
  goals: Goal[]
  templates: TaskTemplate[]
  dailyTasks: DailyTask[]
  /** Tracked time per project in the period, from the Analytics summary. */
  actual: ProjectTotal[]
}>()

const { settings } = useSettings()
const { entries } = useTimeEntries()

const bounds = computed(() =>
  planBounds(
    props.period,
    getTodayISODate(),
    earliestPlanDate(entries.value, props.dailyTasks, props.templates),
  ),
)

const planned = computed(() =>
  plannedMsByProject(
    {
      templates: props.templates,
      dailyTasks: props.dailyTasks,
      defaultDurationMinutes: settings.calendar.defaultDurationMinutes,
    },
    bounds.value.from,
    bounds.value.to,
  ),
)

const result = computed(() =>
  planVsActual(planned.value, props.actual, props.goals),
)

function hours(ms: number): string {
  return formatHoursMinutes(ms)
}

/** Signed, so an overrun reads as "+" and a shortfall as "−". */
function signedHours(ms: number): string {
  const label = formatHoursMinutes(Math.abs(ms))
  if (label === '0 m') return label
  return `${ms > 0 ? '+' : '−'}${label}`
}

function percentLabel(percent: number | null): string {
  if (percent === null) return '—'
  if (Math.abs(percent) < 0.5) return '0%'
  return `${percent > 0 ? '+' : '−'}${Math.round(Math.abs(percent))}%`
}

const STATE_LABEL: Record<PlanState, string> = {
  [PLAN_STATE.OVER]: 'Over plan',
  [PLAN_STATE.UNDER]: 'Under plan',
  [PLAN_STATE.ON]: 'On plan',
  [PLAN_STATE.UNPLANNED]: 'Not planned',
}

const rangeNote = computed(() => {
  const { from, to } = bounds.value
  return from === to ? from : `${from} to ${to}`
})
</script>

<template>
  <section class="plan-vs-actual" aria-label="Plan versus actual">
    <p class="sidebar-caption">Plan vs actual</p>
    <p class="analytics__hint">
      Planned is the time scheduled in the calendar for this period, repeating
      tasks included. Actual is the time tracked. {{ rangeNote }}.
    </p>

    <p
      v-if="result.rows.length === 0"
      class="timer-history__empty"
    >
      Nothing planned or tracked for this period yet.
    </p>

    <div v-else class="analytics-table-wrap">
      <table class="analytics-table plan-vs-actual__table">
        <thead>
          <tr>
            <th class="analytics-table__name">Project</th>
            <th class="analytics-table__num">Planned</th>
            <th class="analytics-table__num">Actual</th>
            <th class="analytics-table__num">Difference</th>
            <th class="analytics-table__num">%</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in result.rows" :key="row.key">
            <td class="analytics-table__name" :title="row.title">
              <span class="analytics-project__title">{{ row.title }}</span>
              <span class="plan-vs-actual__state" :class="`is-${row.state}`">
                {{ STATE_LABEL[row.state] }}
              </span>
            </td>
            <td class="analytics-table__num">{{ hours(row.plannedMs) }}</td>
            <td class="analytics-table__num">{{ hours(row.actualMs) }}</td>
            <td
              class="analytics-table__num plan-vs-actual__diff"
              :class="`is-${row.state}`"
            >
              {{ signedHours(row.diffMs) }}
            </td>
            <td class="analytics-table__num">{{ percentLabel(row.percent) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="plan-vs-actual__total">
            <th class="analytics-table__name" scope="row">Overall</th>
            <td class="analytics-table__num">{{ hours(result.total.plannedMs) }}</td>
            <td class="analytics-table__num">{{ hours(result.total.actualMs) }}</td>
            <td
              class="analytics-table__num plan-vs-actual__diff"
              :class="`is-${result.total.state}`"
            >
              {{ signedHours(result.total.diffMs) }}
            </td>
            <td class="analytics-table__num">{{ percentLabel(result.total.percent) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </section>
</template>
