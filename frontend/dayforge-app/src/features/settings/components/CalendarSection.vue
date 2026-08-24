<script setup lang="ts">
import { useSettings } from '../../../composables/useSettings'
import {
  MINUTE_STEPS,
  TASK_DURATIONS,
  WEEK_START_OPTIONS,
} from '../composables/settingsOptions'
import { rangeValue, textValue } from '../../../composables/inputValue'

const { settings, update, resetSection } = useSettings()
</script>

<template>
  <div class="settings-section">
    <p class="settings-section__intro">
      The grid always covers a full 00:00–24:00 day, so a task can never be
      scheduled somewhere it cannot be seen.
    </p>

    <p class="sidebar-caption">Snap dragging to</p>
    <div class="settings-chips">
      <button
        v-for="minutes in MINUTE_STEPS"
        :key="minutes"
        class="theme-chip"
        :class="{ active: settings.calendar.snapMinutes === minutes }"
        type="button"
        @click="update('calendar', { snapMinutes: minutes })"
      >
        {{ minutes }} min
      </button>
    </div>

    <label class="settings-slider">
      <span>
        Hour height
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
      <small>Zoom for the day and week grids.</small>
    </label>

    <p class="sidebar-caption">New task</p>

    <p class="settings-group-hint">Lasts</p>
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
        {{ minutes }} min
      </button>
    </div>

    <div class="settings-times">
      <label>
        Starts at
        <input
          type="time"
          :value="settings.calendar.defaultStartTime"
          @change="update('calendar', { defaultStartTime: textValue($event) })"
        />
      </label>
    </div>

    <p class="sidebar-caption">Week</p>

    <p class="settings-group-hint">Starts on</p>
    <div class="settings-chips">
      <button
        v-for="option in WEEK_START_OPTIONS"
        :key="option.id"
        class="theme-chip"
        :class="{ active: settings.calendar.weekStartsOn === option.id }"
        type="button"
        @click="update('calendar', { weekStartsOn: option.id })"
      >
        {{ option.label }}
      </button>
    </div>

    <label class="settings-slider">
      <span>
        A full day is
        <em>{{ settings.calendar.fullDayHours }} h</em>
      </span>
      <input
        type="range"
        min="1"
        max="16"
        step="1"
        :value="settings.calendar.fullDayHours"
        @input="update('calendar', { fullDayHours: rangeValue($event) })"
      />
      <small>The scale the month view tints a day's workload against.</small>
    </label>

    <button
      class="btn btn-ghost settings-reset"
      type="button"
      @click="resetSection('calendar')"
    >
      Reset calendar
    </button>
  </div>
</template>
