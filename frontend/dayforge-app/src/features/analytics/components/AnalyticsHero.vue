<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatHoursMinutes } from '../../../composables/timer/format'

const { t } = useI18n()

/**
 * The period at a glance. The plan is the time planned up to today, so the
 * bar and percent only mean something when something was planned.
 */
const props = defineProps<{
  trackedMs: number
  plannedMs: number
  sessionCount: number
  dayCount: number
  hasAdjustments: boolean
}>()

const showInfo = ref(false)

const hasPlan = computed(() => props.plannedMs > 0)

const percent = computed(() =>
  hasPlan.value ? Math.round((props.trackedMs / props.plannedMs) * 100) : 0,
)

const barWidth = computed(() => `${Math.min(percent.value, 100)}%`)

const averageLabel = computed(() =>
  props.dayCount > 0
    ? formatHoursMinutes(props.trackedMs / props.dayCount)
    : '—',
)
</script>

<template>
  <section class="analytics-hero ui-card" :aria-label="t('analytics.heroAria')">
    <div class="analytics-hero__main">
      <div class="analytics-hero__head">
        <p class="analytics-hero__figure">
          <span class="analytics-hero__tracked ui-oneline">
            {{ formatHoursMinutes(trackedMs) }}
          </span>
          <span v-if="hasPlan" class="analytics-hero__plan ui-oneline">
            / {{ formatHoursMinutes(plannedMs) }}
          </span>
        </p>
        <span v-if="hasPlan" class="analytics-hero__percent"
          >{{ percent }}%</span
        >
        <button
          class="ui-icon-btn"
          type="button"
          :aria-label="t('analytics.heroInfoLabel')"
          aria-controls="analytics-hero-info"
          :aria-expanded="showInfo"
          @click="showInfo = !showInfo"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9"></circle>
            <path d="M12 11v5M12 8h.01"></path>
          </svg>
        </button>
      </div>

      <div
        v-if="hasPlan"
        class="ui-progress"
        role="progressbar"
        :aria-label="t('analytics.heroProgressLabel')"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="Math.min(percent, 100)"
      >
        <span :style="{ width: barWidth }"></span>
      </div>

      <p
        v-show="showInfo"
        id="analytics-hero-info"
        class="analytics-hero__info"
      >
        {{ t('analytics.heroInfo')
        }}<template v-if="hasAdjustments">{{
          t('analytics.heroInfoAdjusted')
        }}</template>
      </p>
    </div>

    <div class="analytics-hero__stats">
      <div class="ui-stat analytics-hero__stat">
        <span class="ui-stat__label analytics-hero__label">
          <svg
            class="analytics-hero__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="13" r="8"></circle>
            <path d="M12 9v4l2 2M10 2h4"></path>
          </svg>
          <span class="analytics-hero__name">{{
            t('analytics.sessions')
          }}</span>
        </span>
        <strong class="ui-stat__value">{{ sessionCount }}</strong>
      </div>

      <div class="ui-stat analytics-hero__stat">
        <span class="ui-stat__label analytics-hero__label">
          <svg
            class="analytics-hero__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <rect x="3" y="5" width="18" height="16" rx="2"></rect>
            <path d="M3 10h18M8 3v4M16 3v4"></path>
          </svg>
          <span class="analytics-hero__name">{{ t('analytics.days') }}</span>
        </span>
        <strong class="ui-stat__value">{{ dayCount }}</strong>
      </div>

      <div class="ui-stat analytics-hero__stat">
        <span class="ui-stat__label analytics-hero__label">
          <svg
            class="analytics-hero__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M4 19V9M10 19V5M16 19v-7M22 19H2"></path>
          </svg>
          <span class="analytics-hero__name">{{ t('analytics.perDay') }}</span>
        </span>
        <strong class="ui-stat__value">{{ averageLabel }}</strong>
      </div>
    </div>
  </section>
</template>

<style scoped>
.analytics-hero {
  display: grid;
  gap: 12px;
  padding: 18px;
}

.analytics-hero__main {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.analytics-hero__head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.analytics-hero__figure {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
}

.analytics-hero__tracked {
  font-size: calc(28px * var(--text-scale));
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.analytics-hero__plan {
  font-size: calc(14px * var(--text-scale));
  color: var(--muted);
}

.analytics-hero__percent {
  flex: 0 0 auto;
  font-size: calc(18px * var(--text-scale));
  font-weight: 700;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.analytics-hero__info {
  margin: 0;
  font-size: calc(13px * var(--text-scale));
  color: var(--muted);
}

/* Phone: icon and value on one line, the name read by screen readers only. */
.analytics-hero__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  color: var(--muted);
}

.analytics-hero__stat {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
}

.analytics-hero__label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.analytics-hero__icon {
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
}

.analytics-hero__stat .ui-stat__value {
  font-size: calc(13px * var(--text-scale));
}

.analytics-hero__name {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@container analytics (min-width: 900px) {
  .analytics-hero {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 24px;
    padding: 22px 24px;
  }

  .analytics-hero__main {
    flex: 1 1 420px;
  }

  .analytics-hero__stats {
    flex: 0 0 auto;
    gap: 28px;
  }

  .analytics-hero__stat {
    display: grid;
    align-items: start;
    gap: 4px;
  }

  .analytics-hero__stat .ui-stat__value {
    font-size: calc(18px * var(--text-scale));
  }

  .analytics-hero__name {
    position: static;
    width: auto;
    height: auto;
    overflow: visible;
    clip-path: none;
  }
}
</style>
