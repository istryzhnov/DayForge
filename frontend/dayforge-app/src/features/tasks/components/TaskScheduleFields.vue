<script setup lang="ts">
import ComposerToggleSection from './ComposerToggleSection.vue'
import {
  MAX_TIME,
  MIN_TIME,
  REPEAT_OPTIONS,
  WEEKDAY_OPTIONS,
  useTaskScheduleState,
} from '../composables/useTaskScheduleState'

const {
  isEnabled,
  date,
  startTime,
  endTime,
  repeatType,
  intervalDays,
  weekdays,
  minDate,
  isWeekly,
  isCustomInterval,
  isRepeating,
  isAnnual,
  error,
  isValid,
  toggleWeekday,
  buildSchedule,
  reset,
} = useTaskScheduleState()

// The owning composer reads the payload on submit and clears it afterwards.
defineExpose({ buildSchedule, reset, isValid, isEnabled })
</script>

<template>
  <ComposerToggleSection v-model="isEnabled" label="Schedule on the calendar">
    <div class="task-schedule__fields">
      <div class="task-schedule__row">
        <label class="task-schedule__field">
          <span class="task-schedule__label">Date</span>
          <input v-model="date" type="date" :min="minDate" />
        </label>

        <label class="task-schedule__field">
          <span class="task-schedule__label">Start</span>
          <input
            v-model="startTime"
            type="time"
            :min="MIN_TIME"
            :max="MAX_TIME"
          />
        </label>

        <label class="task-schedule__field">
          <span class="task-schedule__label">End</span>
          <input
            v-model="endTime"
            type="time"
            :min="MIN_TIME"
            :max="MAX_TIME"
          />
        </label>
      </div>

      <div class="task-schedule__row">
        <label class="task-schedule__field">
          <span class="task-schedule__label">Repeat</span>
          <select v-model="repeatType">
            <option
              v-for="option in REPEAT_OPTIONS"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>

        <label v-if="isCustomInterval" class="task-schedule__field">
          <span class="task-schedule__label">Every (days)</span>
          <input v-model.number="intervalDays" type="number" min="1" max="30" />
        </label>
      </div>

      <div v-if="isWeekly" class="task-schedule__weekdays">
        <button
          v-for="day in WEEKDAY_OPTIONS"
          :key="day.value"
          class="task-schedule__weekday"
          :class="{ 'is-selected': weekdays.includes(day.value) }"
          type="button"
          @click="toggleWeekday(day.value)"
        >
          {{ day.label }}
        </button>
      </div>

      <p v-if="error" class="task-schedule__error">{{ error }}</p>
      <p v-else-if="isAnnual" class="task-schedule__hint">
        Comes round every year on this date — listed under Planned tasks.
      </p>
      <p v-else-if="isRepeating" class="task-schedule__hint">
        Repeats from {{ date }} with no end date.
      </p>
      <p v-else class="task-schedule__hint">
        On the calendar for {{ date }} — also listed under Planned tasks.
      </p>
    </div>
  </ComposerToggleSection>
</template>
