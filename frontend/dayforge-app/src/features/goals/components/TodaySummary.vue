<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { formatHoursMinutes } from '../../../shared/composables/timer/format'
import { durationWords } from '../../../shared/composables/timer/text'

defineProps<{
  trackedMs: number
  /** Formatted money earned today; null hides the cell (no rate is set). */
  earned: string | null
  done: number
  total: number
}>()

const { t } = useI18n()
</script>

<template>
  <section class="today-summary" :aria-label="t('today.summaryAria')">
    <div
      class="today-summary__grid"
      :class="{ 'is-no-money': earned === null }"
    >
      <div class="ui-stat">
        <span class="ui-stat__label">{{ t('today.tracked') }}</span>
        <span class="ui-stat__value today-summary__value">{{
          formatHoursMinutes(trackedMs, durationWords())
        }}</span>
      </div>
      <div v-if="earned !== null" class="ui-stat">
        <span class="ui-stat__label">{{ t('today.earned') }}</span>
        <span
          class="ui-stat__value today-summary__value today-summary__value--money"
          >{{ earned }}</span
        >
      </div>
      <div class="ui-stat">
        <span class="ui-stat__label">{{ t('today.tasks') }}</span>
        <span class="ui-stat__value today-summary__value"
          >{{ done }}/{{ total }}</span
        >
      </div>
    </div>
  </section>
</template>
