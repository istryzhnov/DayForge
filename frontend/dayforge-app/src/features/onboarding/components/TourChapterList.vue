<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ChapterId } from '../composables/tourSteps'
import { TOUR_CHAPTERS } from '../composables/tourSteps'
import { useTour } from '../composables/useTour'

/** Starting a chapter; the owner can close the panel it sits in. */
const emit = defineEmits<{ (e: 'start', chapter: ChapterId): void }>()

const { t } = useI18n()
const { completed, startChapter } = useTour()

function start(chapter: ChapterId) {
  startChapter(chapter)
  emit('start', chapter)
}
</script>

<template>
  <ul class="tour-chapters" :aria-label="t('onboarding.tourListLabel')">
    <li
      v-for="chapter in TOUR_CHAPTERS"
      :key="chapter.id"
      class="tour-chapters__row"
    >
      <span class="tour-chapters__name">
        {{ t(chapter.titleKey) }}
        <span
          v-if="completed.includes(chapter.id)"
          class="tour-chapters__done"
          :aria-label="t('onboarding.tourCompleted')"
          :title="t('onboarding.tourCompleted')"
          >✓</span
        >
      </span>
      <button class="btn btn-ghost" type="button" @click="start(chapter.id)">
        {{
          completed.includes(chapter.id)
            ? t('onboarding.tourAgain')
            : t('onboarding.tourStart')
        }}
      </button>
    </li>
  </ul>
</template>

<style scoped>
.tour-chapters {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tour-chapters__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.tour-chapters__name {
  white-space: normal;
}

.tour-chapters__done {
  margin-left: 6px;
  color: var(--accent, #ff7a2f);
}
</style>
