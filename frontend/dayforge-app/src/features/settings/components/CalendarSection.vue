<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useSettings } from '../../../composables/useSettings'
import {
  MINUTE_STEPS,
  TASK_DURATIONS,
  WEEK_START_OPTIONS,
} from '../composables/settingsOptions'
import { rangeValue, textValue } from '../../../composables/inputValue'

const { t } = useI18n()

const { settings, update, resetSection } = useSettings()
</script>

<template>
  <div class="settings-section">
    <p class="settings-section__intro">
      {{ t('settings.calendarIntro') }}
    </p>

    <p class="sidebar-caption">{{ t('settings.calendarSnap') }}</p>
    <div class="settings-chips">
      <button
        v-for="minutes in MINUTE_STEPS"
        :key="minutes"
        class="theme-chip"
        :class="{ active: settings.calendar.snapMinutes === minutes }"
        type="button"
        @click="update('calendar', { snapMinutes: minutes })"
      >
        {{ t('settings.minutesShort', { n: minutes }) }}
      </button>
    </div>

    <label class="settings-slider">
      <span>
        {{ t('settings.calendarHourHeight') }}
        <em>{{ settings.calendar.hourHeight }}px</em>
      </span>
      <input
        type="range"
        min="30"
        max="160"
        step="5"
        :value="settings.calendar.hourHeight"
        @input="update('calendar', { hourHeight: rangeValue($event) })"
      />
      <small>{{ t('settings.calendarZoomHint') }}</small>
    </label>

    <p class="sidebar-caption">{{ t('settings.calendarNewTask') }}</p>

    <p class="settings-group-hint">{{ t('settings.calendarLasts') }}</p>
    <div class="settings-chips">
      <button
        v-for="minutes in TASK_DURATIONS"
        :key="minutes"
        class="theme-chip"
        :class="{
          active: settings.calendar.defaultDurationMinutes === minutes,
        }"
        type="button"
        @click="update('calendar', { defaultDurationMinutes: minutes })"
      >
        {{ t('settings.minutesShort', { n: minutes }) }}
      </button>
    </div>

    <div class="settings-times">
      <label>
        {{ t('settings.calendarStartsAt') }}
        <input
          type="time"
          :value="settings.calendar.defaultStartTime"
          @change="update('calendar', { defaultStartTime: textValue($event) })"
        />
      </label>
    </div>

    <p class="sidebar-caption">{{ t('settings.calendarWeek') }}</p>

    <p class="settings-group-hint">{{ t('settings.calendarStartsOn') }}</p>
    <div class="settings-chips">
      <button
        v-for="option in WEEK_START_OPTIONS"
        :key="option.id"
        class="theme-chip"
        :class="{ active: settings.calendar.weekStartsOn === option.id }"
        type="button"
        @click="update('calendar', { weekStartsOn: option.id })"
      >
        {{ t(option.labelKey) }}
      </button>
    </div>

    <label class="settings-slider">
      <span>
        {{ t('settings.calendarFullDay') }}
        <em>{{
          t('settings.hoursShort', { n: settings.calendar.fullDayHours })
        }}</em>
      </span>
      <input
        type="range"
        min="1"
        max="16"
        step="1"
        :value="settings.calendar.fullDayHours"
        @input="update('calendar', { fullDayHours: rangeValue($event) })"
      />
      <small>{{ t('settings.calendarFullDayHint') }}</small>
    </label>

    <button
      class="btn btn-ghost settings-reset"
      type="button"
      @click="resetSection('calendar')"
    >
      {{ t('settings.calendarReset') }}
    </button>
  </div>
</template>
