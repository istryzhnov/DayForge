<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ComposerToggleSection from './ComposerToggleSection.vue'
import DisclosureSection from '../../../components/DisclosureSection.vue'
import {
  MAX_TIME,
  MIN_TIME,
  REPEAT_OPTIONS,
  WEEKDAY_OPTIONS,
  useTaskScheduleState,
} from '../composables/useTaskScheduleState'

const { t } = useI18n()

// Owned by the parent when it binds `enabled`, otherwise kept here.
const isEnabled = defineModel<boolean>('enabled', { default: false })

// A composer with its own calendar button hides the checkbox.
defineProps<{ hideToggle?: boolean }>()

const {
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
  isNextDay,
  toggleWeekday,
  buildSchedule,
  load,
  reset,
} = useTaskScheduleState(isEnabled)

// The owning composer reads the payload on submit and clears it afterwards.
defineExpose({ buildSchedule, load, reset, isValid, isEnabled })
</script>

<template>
  <ComposerToggleSection
    v-model="isEnabled"
    :label="t('tasks.scheduleOnCalendar')"
    :hide-toggle="hideToggle"
  >
    <div class="task-schedule__fields">
      <div class="task-schedule__row">
        <label class="task-schedule__field">
          <span class="task-schedule__label">{{ t('tasks.date') }}</span>
          <input v-model="date" type="date" :min="minDate" />
        </label>

        <label class="task-schedule__field">
          <span class="task-schedule__label">{{ t('tasks.start') }}</span>
          <input
            v-model="startTime"
            type="time"
            :min="MIN_TIME"
            :max="MAX_TIME"
          />
        </label>

        <label class="task-schedule__field">
          <span class="task-schedule__label">{{ t('tasks.end') }}</span>
          <input
            v-model="endTime"
            type="time"
            :min="MIN_TIME"
            :max="MAX_TIME"
          />
          <span v-if="isNextDay" class="task-schedule__next-day">
            {{ t('tasks.nextDay') }}
          </span>
        </label>
      </div>

      <DisclosureSection :label="t('tasks.repeat')" :open="isRepeating">
        <div class="task-schedule__row">
          <label class="task-schedule__field">
            <span class="task-schedule__label">{{ t('tasks.repeat') }}</span>
            <select v-model="repeatType">
              <option
                v-for="option in REPEAT_OPTIONS"
                :key="option.value"
                :value="option.value"
              >
                {{ t(option.labelKey) }}
              </option>
            </select>
          </label>

          <label v-if="isCustomInterval" class="task-schedule__field">
            <span class="task-schedule__label">{{ t('tasks.everyDays') }}</span>
            <input
              v-model.number="intervalDays"
              type="number"
              min="1"
              max="30"
            />
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
            {{ t(day.labelKey) }}
          </button>
        </div>
      </DisclosureSection>

      <p v-if="error" class="task-schedule__error">{{ error }}</p>
      <p v-else-if="isAnnual" class="task-schedule__hint">
        {{ t('tasks.hintAnnual') }}
      </p>
      <p v-else-if="isRepeating" class="task-schedule__hint">
        {{ t('tasks.hintRepeats', { date }) }}
      </p>
      <p v-else class="task-schedule__hint">
        {{ t('tasks.hintOnce', { date }) }}
      </p>
    </div>
  </ComposerToggleSection>
</template>
