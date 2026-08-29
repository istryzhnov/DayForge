<script setup lang="ts">
import {
  CURRENCY_OPTIONS,
  useSettings,
} from '../../../composables/useSettings'
import {
  COUNTDOWN_LENGTHS,
  FOCUS_LENGTHS,
  BREAK_LENGTHS,
  LONG_BREAK_EVERY,
} from '../composables/settingsOptions'
import {
  checkedValue,
  rangeValue,
  textValue,
} from '../../../composables/inputValue'

const { settings, update, resetSection } = useSettings()
</script>

<template>
  <div class="settings-section">
    <p class="settings-section__intro">
      One timer runs at a time. It keeps counting while the tab is closed, and
      settles up when you come back.
    </p>

    <p class="sidebar-caption">Pomodoro</p>

    <p class="settings-group-hint">Focus lasts</p>
    <div class="settings-chips">
      <button
        v-for="minutes in FOCUS_LENGTHS"
        :key="minutes"
        class="theme-chip"
        :class="{ active: settings.timer.focusMinutes === minutes }"
        type="button"
        @click="update('timer', { focusMinutes: minutes })"
      >
        {{ minutes }} min
      </button>
    </div>

    <p class="settings-group-hint">Short break</p>
    <div class="settings-chips">
      <button
        v-for="minutes in BREAK_LENGTHS"
        :key="minutes"
        class="theme-chip"
        :class="{ active: settings.timer.shortBreakMinutes === minutes }"
        type="button"
        @click="update('timer', { shortBreakMinutes: minutes })"
      >
        {{ minutes }} min
      </button>
    </div>

    <p class="settings-group-hint">Long break</p>
    <div class="settings-chips">
      <button
        v-for="minutes in BREAK_LENGTHS"
        :key="minutes"
        class="theme-chip"
        :class="{ active: settings.timer.longBreakMinutes === minutes }"
        type="button"
        @click="update('timer', { longBreakMinutes: minutes })"
      >
        {{ minutes }} min
      </button>
    </div>

    <p class="settings-group-hint">Long break after</p>
    <div class="settings-chips">
      <button
        v-for="count in LONG_BREAK_EVERY"
        :key="count"
        class="theme-chip"
        :class="{ active: settings.timer.longBreakEvery === count }"
        type="button"
        @click="update('timer', { longBreakEvery: count })"
      >
        {{ count }} focus
      </button>
    </div>

    <label class="settings-toggle">
      <input
        type="checkbox"
        :checked="settings.timer.autoStartBreaks"
        @change="update('timer', { autoStartBreaks: checkedValue($event) })"
      />
      <span>
        <strong>Start breaks on their own</strong>
        <em>Off means a finished focus phase waits for you.</em>
      </span>
    </label>

    <label class="settings-toggle">
      <input
        type="checkbox"
        :checked="settings.timer.autoStartFocus"
        @change="update('timer', { autoStartFocus: checkedValue($event) })"
      />
      <span>
        <strong>Start the next focus on its own</strong>
        <em>A break rolls straight back into work.</em>
      </span>
    </label>

    <p class="sidebar-caption">Countdown</p>

    <p class="settings-group-hint">Starts from</p>
    <div class="settings-chips">
      <button
        v-for="minutes in COUNTDOWN_LENGTHS"
        :key="minutes"
        class="theme-chip"
        :class="{ active: settings.timer.defaultCountdownMinutes === minutes }"
        type="button"
        @click="update('timer', { defaultCountdownMinutes: minutes })"
      >
        {{ minutes }} min
      </button>
    </div>

    <p class="sidebar-caption">Billing</p>

    <p class="settings-group-hint">
      Set a rate and Analytics turns tracked hours into money. Zero keeps it
      out of the way. A project or a single task can bill at its own rate
      instead.
    </p>

    <div class="settings-times">
      <label>
        Per hour
        <input
          type="number"
          min="0"
          step="1"
          :value="settings.timer.hourlyRate"
          @input="update('timer', { hourlyRate: rangeValue($event) })"
        />
      </label>
      <label>
        Currency
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

    <p class="sidebar-caption">History</p>

    <p class="settings-group-hint">
      Every stretch you track is kept and stays on its task. Pomodoro breaks
      are the only thing not recorded.
    </p>

    <label class="settings-toggle">
      <input
        type="checkbox"
        :checked="settings.timer.sound"
        @change="update('timer', { sound: checkedValue($event) })"
      />
      <span>
        <strong>Chime when a phase ends</strong>
        <em>Uses the reminder volume. Silent while the tab is closed.</em>
      </span>
    </label>

    <button
      class="btn btn-ghost settings-reset"
      type="button"
      @click="resetSection('timer')"
    >
      Reset timer
    </button>
  </div>
</template>
