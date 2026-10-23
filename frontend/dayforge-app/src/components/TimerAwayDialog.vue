<script setup lang="ts">
import { computed } from 'vue'
import { useTimerReminders } from '../composables/useTimerReminders'
import { formatAwayTime } from '../composables/timer/reminders'

const { awayPrompt, keepAway, discardAway, discardAndStopAway } =
  useTimerReminders()

const awayLabel = computed(() =>
  awayPrompt.value
    ? formatAwayTime(awayPrompt.value.returnedAt - awayPrompt.value.hiddenAt)
    : '',
)
</script>

<template>
  <div
    v-if="awayPrompt"
    class="new-goal-modal task-reminder-modal"
  >
    <div class="modal-overlay"></div>
    <div
      class="modal-card task-reminder-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="timer-away-title"
    >
      <p class="task-reminder-card__eyebrow">Timer</p>
      <h3 id="timer-away-title">You were away {{ awayLabel }}</h3>
      <p class="task-reminder-card__hint">
        The timer kept running while DayForge was in the background. Should
        that time count?
      </p>
      <div class="modal-actions">
        <button class="btn btn-ghost" type="button" @click="discardAndStopAway">
          Discard and stop
        </button>
        <button class="btn btn-ghost" type="button" @click="discardAway">
          Discard the away time
        </button>
        <button class="btn btn-primary" type="button" @click="keepAway">
          Keep the time
        </button>
      </div>
    </div>
  </div>
</template>
