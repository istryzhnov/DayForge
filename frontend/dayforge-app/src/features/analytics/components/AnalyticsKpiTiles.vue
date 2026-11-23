<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PeriodDeltas } from '../composables/periodComparison'
import AnalyticsDelta from './AnalyticsDelta.vue'

const { t } = useI18n()

const props = defineProps<{
  /** Earnings tile only shows when a rate is set. */
  showsMoney: boolean
  earnedLabel: string
  trackedMs: number
  plannedMs: number
  tasksDone: number
  deltas: PeriodDeltas
}>()

const planPercent = computed(() =>
  props.plannedMs > 0
    ? Math.round((props.trackedMs / props.plannedMs) * 100)
    : null,
)

const planBar = computed(() => `${Math.min(planPercent.value ?? 0, 100)}%`)
</script>

<template>
  <ul class="analytics-kpis" :aria-label="t('analytics.kpiAria')">
    <li v-if="showsMoney" class="analytics-kpi">
      <span class="analytics-kpi__label">{{ t('analytics.earned') }}</span>
      <strong class="analytics-kpi__value analytics-kpi__value--accent">
        {{ earnedLabel }}
      </strong>
      <AnalyticsDelta
        :value="deltas.earnedPct"
        unit="%"
        :suffix="t('analytics.kpiVsPrevious')"
        :up-label="t('analytics.kpiUp')"
        :down-label="t('analytics.kpiDown')"
      />
    </li>

    <li v-if="planPercent !== null" class="analytics-kpi">
      <span class="analytics-kpi__label">{{
        t('analytics.kpiPlanVsActual')
      }}</span>
      <strong class="analytics-kpi__value">{{ planPercent }}%</strong>
      <span class="ui-progress" role="presentation">
        <span :style="{ width: planBar }"></span>
      </span>
    </li>

    <li class="analytics-kpi">
      <span class="analytics-kpi__label">{{
        t('analytics.kpiTasksDone')
      }}</span>
      <strong class="analytics-kpi__value">{{ tasksDone }}</strong>
      <AnalyticsDelta
        :value="deltas.tasksDone"
        :suffix="t('analytics.kpiVsPrevious')"
        :up-label="t('analytics.kpiUp')"
        :down-label="t('analytics.kpiDown')"
      />
    </li>
  </ul>
</template>

<style scoped>
.analytics-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
  gap: 0.625rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.analytics-kpi {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.375rem;
  min-width: 0;
  padding: 0.875rem 1rem;
  border: 1px solid var(--glass-border);
  border-radius: calc(20px * var(--radius-scale));
  background: var(--glass-sheen), var(--glass-bg);
  box-shadow: var(--glass-highlight);
}

.analytics-kpi__label {
  font-size: calc(0.75rem * var(--text-scale));
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}

.analytics-kpi__value {
  font-family: var(--font-mono);
  font-size: calc(1.25rem * var(--text-scale));
  font-weight: 700;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.analytics-kpi__value--accent {
  color: var(--accent);
}

.analytics-kpi .ui-progress {
  width: 100%;
  margin-top: 0.375rem;
}
</style>
