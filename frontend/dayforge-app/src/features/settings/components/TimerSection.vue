<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { CURRENCY_OPTIONS, useSettings } from '../../../composables/useSettings'
import {
  COUNTDOWN_LENGTHS,
  FOCUS_LENGTHS,
  BREAK_LENGTHS,
  LONG_BREAK_EVERY,
} from '../composables/settingsOptions'
import DisclosureSection from '../../../components/DisclosureSection.vue'
import {
  checkedValue,
  rangeValue,
  textValue,
} from '../../../composables/inputValue'
import {
  IDLE_RETURN_MINUTE_OPTIONS,
  LONG_RUN_HOUR_OPTIONS,
} from '../../../composables/timer/reminders'

const { t } = useI18n()

const { settings, update, resetSection } = useSettings()

function longRunLabel(hours: number): string {
  return hours === 0
    ? t('settings.summaryOff')
    : t('settings.hoursShort', { n: hours })
}

function idleLabel(minutes: number): string {
  if (minutes === 0) return t('settings.summaryOff')
  return minutes === 60
    ? t('settings.hoursShort', { n: 1 })
    : t('settings.minutesShort', { n: minutes })
}
</script>

<template>
  <div class="settings-section">
    <p class="settings-section__intro">
      {{ t('settings.timerIntro') }}
    </p>

    <p class="settings-group-hint">{{ t('settings.timerFocusLasts') }}</p>
    <div class="ui-chips">
      <button
        v-for="minutes in FOCUS_LENGTHS"
        :key="minutes"
        class="ui-chip ui-chip--wrap"
        :class="{ 'is-active': settings.timer.focusMinutes === minutes }"
        type="button"
        @click="update('timer', { focusMinutes: minutes })"
      >
        {{ t('settings.minutesShort', { n: minutes }) }}
      </button>
    </div>

    <p class="ui-section-label ui-section-label--wrap">
      {{ t('settings.timerCountdownCaption') }}
    </p>

    <p class="settings-group-hint">{{ t('settings.timerStartsFrom') }}</p>
    <div class="ui-chips">
      <button
        v-for="minutes in COUNTDOWN_LENGTHS"
        :key="minutes"
        class="ui-chip ui-chip--wrap"
        :class="{
          'is-active': settings.timer.defaultCountdownMinutes === minutes,
        }"
        type="button"
        @click="update('timer', { defaultCountdownMinutes: minutes })"
      >
        {{ t('settings.minutesShort', { n: minutes }) }}
      </button>
    </div>

    <p class="ui-section-label ui-section-label--wrap">
      {{ t('settings.timerRemindersCaption') }}
    </p>
    <p class="settings-group-hint">
      {{ t('settings.timerRemindersHint') }}
    </p>

    <p class="settings-group-hint">{{ t('settings.timerLongRunLabel') }}</p>
    <div class="ui-chips">
      <button
        v-for="hours in LONG_RUN_HOUR_OPTIONS"
        :key="hours"
        class="ui-chip ui-chip--wrap"
        :class="{ 'is-active': settings.timer.longRunHours === hours }"
        type="button"
        @click="update('timer', { longRunHours: hours })"
      >
        {{ longRunLabel(hours) }}
      </button>
    </div>

    <p class="settings-group-hint">{{ t('settings.timerIdleLabel') }}</p>
    <div class="ui-chips">
      <button
        v-for="minutes in IDLE_RETURN_MINUTE_OPTIONS"
        :key="minutes"
        class="ui-chip ui-chip--wrap"
        :class="{ 'is-active': settings.timer.idleReturnMinutes === minutes }"
        type="button"
        @click="update('timer', { idleReturnMinutes: minutes })"
      >
        {{ idleLabel(minutes) }}
      </button>
    </div>

    <DisclosureSection :label="t('settings.advanced')">
      <p class="ui-section-label ui-section-label--wrap">
        {{ t('settings.timerBreaksCaption') }}
      </p>

      <p class="settings-group-hint">{{ t('settings.timerShortBreak') }}</p>
      <div class="ui-chips">
        <button
          v-for="minutes in BREAK_LENGTHS"
          :key="minutes"
          class="ui-chip ui-chip--wrap"
          :class="{ 'is-active': settings.timer.shortBreakMinutes === minutes }"
          type="button"
          @click="update('timer', { shortBreakMinutes: minutes })"
        >
          {{ t('settings.minutesShort', { n: minutes }) }}
        </button>
      </div>

      <p class="settings-group-hint">{{ t('settings.timerLongBreak') }}</p>
      <div class="ui-chips">
        <button
          v-for="minutes in BREAK_LENGTHS"
          :key="minutes"
          class="ui-chip ui-chip--wrap"
          :class="{ 'is-active': settings.timer.longBreakMinutes === minutes }"
          type="button"
          @click="update('timer', { longBreakMinutes: minutes })"
        >
          {{ t('settings.minutesShort', { n: minutes }) }}
        </button>
      </div>

      <p class="settings-group-hint">{{ t('settings.timerLongBreakAfter') }}</p>
      <div class="ui-chips">
        <button
          v-for="count in LONG_BREAK_EVERY"
          :key="count"
          class="ui-chip ui-chip--wrap"
          :class="{ 'is-active': settings.timer.longBreakEvery === count }"
          type="button"
          @click="update('timer', { longBreakEvery: count })"
        >
          {{ t('settings.timerFocusCount', count) }}
        </button>
      </div>

      <label class="settings-toggle ui-card">
        <input
          type="checkbox"
          :checked="settings.timer.autoStartBreaks"
          @change="update('timer', { autoStartBreaks: checkedValue($event) })"
        />
        <span>
          <strong>{{ t('settings.timerAutoBreaks') }}</strong>
          <em>{{ t('settings.timerAutoBreaksHint') }}</em>
        </span>
      </label>

      <label class="settings-toggle ui-card">
        <input
          type="checkbox"
          :checked="settings.timer.autoStartFocus"
          @change="update('timer', { autoStartFocus: checkedValue($event) })"
        />
        <span>
          <strong>{{ t('settings.timerAutoFocus') }}</strong>
          <em>{{ t('settings.timerAutoFocusHint') }}</em>
        </span>
      </label>

      <label class="settings-toggle ui-card">
        <input
          type="checkbox"
          :checked="settings.timer.sound"
          @change="update('timer', { sound: checkedValue($event) })"
        />
        <span>
          <strong>{{ t('settings.timerChime') }}</strong>
          <em>{{ t('settings.timerChimeHint') }}</em>
        </span>
      </label>

      <p class="ui-section-label ui-section-label--wrap">
        {{ t('settings.timerDefaultRate') }}
      </p>

      <p class="settings-group-hint">
        {{ t('settings.timerRateHint') }}
      </p>

      <div class="settings-times">
        <label>
          {{ t('settings.timerPerHour') }}
          <input
            type="number"
            min="0"
            step="1"
            :value="settings.timer.hourlyRate"
            @input="update('timer', { hourlyRate: rangeValue($event) })"
          />
        </label>
        <label>
          {{ t('settings.timerCurrency') }}
          <select
            :value="settings.timer.currency"
            @change="update('timer', { currency: textValue($event) })"
          >
            <option
              v-for="option in CURRENCY_OPTIONS"
              :key="option.id"
              :value="option.id"
            >
              {{ option.label }}
            </option>
          </select>
        </label>
      </div>
    </DisclosureSection>

    <button
      class="btn btn-ghost settings-reset"
      type="button"
      @click="resetSection('timer')"
    >
      {{ t('settings.timerReset') }}
    </button>
  </div>
</template>
