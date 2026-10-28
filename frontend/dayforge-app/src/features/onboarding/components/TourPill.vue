<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppIcon from '../../../components/AppIcon.vue'
import { useTour } from '../composables/useTour'

const { t } = useI18n()

/** Shows while the tour runs; a click brings back the bubble that was closed. */
const { running, stepNumber, stepCount, reopen } = useTour()
</script>

<template>
  <button
    v-if="running"
    class="tour-pill"
    type="button"
    :aria-label="
      t('onboarding.tourPillAria', { number: stepNumber, total: stepCount })
    "
    @click="reopen"
  >
    <AppIcon name="target" :size="14" />
    <span class="tour-pill__label">{{ t('onboarding.tourPillLabel') }}</span>
    <span class="tour-pill__count">{{ stepNumber }}/{{ stepCount }}</span>
  </button>
</template>
