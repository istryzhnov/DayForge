<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTimerReminders } from '../composables/useTimerReminders'
import { formatAwayTime } from '../composables/timer/reminders'
import { awayTimeWords } from '../composables/timer/text'
import { useFormat } from '../composables/useFormat'
import { toLocalISODate } from '../composables/goalSpace/date'

const { t } = useI18n()
const { awayPrompt, keepAway, discardAway, discardAndStopAway } =
  useTimerReminders()
const { formatMoment } = useFormat()

const awayLabel = computed(() =>
  awayPrompt.value
    ? formatAwayTime(
        awayPrompt.value.returnedAt - awayPrompt.value.hiddenAt,
        awayTimeWords(),
      )
    : '',
)

/** "13:05 – 16:17", with the days added when the spell crossed midnight. */
const awayRange = computed(() => {
  const prompt = awayPrompt.value
  if (!prompt) return ''
  const crossesDay =
    toLocalISODate(new Date(prompt.hiddenAt)) !==
    toLocalISODate(new Date(prompt.returnedAt))
  return t('timer.awayWindow', {
    from: formatMoment(prompt.hiddenAt, crossesDay),
    to: formatMoment(prompt.returnedAt, crossesDay),
  })
})
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
      <p class="task-reminder-card__hint">{{ awayRange }}</p>
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
