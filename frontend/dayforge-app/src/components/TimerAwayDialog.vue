<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTimerReminders } from '../composables/useTimerReminders'
import { formatAwayTime } from '../composables/timer/reminders'
import { awayTimeWords } from '../composables/timer/text'

const { t } = useI18n()
const { awayPrompt, keepAway, discardAway, discardAndStopAway } =
  useTimerReminders()

const awayLabel = computed(() =>
  awayPrompt.value
    ? formatAwayTime(
        awayPrompt.value.returnedAt - awayPrompt.value.hiddenAt,
        awayTimeWords(),
      )
    : '',
)
</script>

<template>
  <div v-if="awayPrompt" class="new-goal-modal task-reminder-modal">
    <div class="modal-overlay"></div>
    <div
      class="modal-card task-reminder-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="timer-away-title"
    >
      <p class="task-reminder-card__eyebrow">{{ t('timer.title') }}</p>
      <h3 id="timer-away-title">
        {{ t('timer.awayHeading', { time: awayLabel }) }}
      </h3>
      <p class="task-reminder-card__hint">{{ t('timer.awayHint') }}</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" type="button" @click="discardAndStopAway">
          {{ t('timer.discardAndStop') }}
        </button>
        <button class="btn btn-ghost" type="button" @click="discardAway">
          {{ t('timer.discardAway') }}
        </button>
        <button class="btn btn-primary" type="button" @click="keepAway">
          {{ t('timer.keepTime') }}
        </button>
      </div>
    </div>
  </div>
</template>
