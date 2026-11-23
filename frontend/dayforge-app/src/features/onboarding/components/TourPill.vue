<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '../../../shared/ui/AppIcon.vue'
import { useTour } from '../composables/useTour'

const { t } = useI18n()

/** Shows while a chapter runs; a click brings back the bubble that was closed. */
const { running, chapterTitleKey, stepNumber, stepCount, reopen } = useTour()

const chapterName = computed(() => t(chapterTitleKey.value))

/** How far through the chapter the pill's bar should show. */
const progress = computed(() =>
  stepCount.value > 0
    ? Math.round((stepNumber.value / stepCount.value) * 100)
    : 0,
)
</script>

<template>
  <button
    v-if="running"
    class="tour-pill"
    type="button"
    :aria-label="
      t('onboarding.tourPillAria', {
        chapter: chapterName,
        number: stepNumber,
        total: stepCount,
      })
    "
    @click="reopen"
  >
    <AppIcon name="target" :size="14" />
    <span class="tour-pill__label">{{ chapterName }}</span>
    <span class="tour-pill__count">· {{ stepNumber }}/{{ stepCount }}</span>
    <span class="tour-pill__bar" aria-hidden="true">
      <span class="tour-pill__fill" :style="{ width: `${progress}%` }"></span>
    </span>
  </button>
</template>
