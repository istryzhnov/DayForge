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

const { settings, update, resetSection } = useSettings()

function longRunLabel(hours: number): string {
  return hours === 0 ? 'Off' : `${hours} h`
}

function idleLabel(minutes: number): string {
  if (minutes === 0) return 'Off'
  return minutes === 60 ? '1 h' : `${minutes} min`
}
</script>

<template>
  <div class="settings-section">
    <p class="settings-section__intro">
      One timer runs at a time. It keeps counting while the tab is closed, and
      settles up when you come back.
    </p>

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

    <p class="sidebar-caption">Reminders while running</p>
    <p class="settings-group-hint">
      These only work while DayForge is open, in a tab or the installed app.
      A closed tab cannot remind you.
    </p>

    <p class="settings-group-hint">Remind me after the timer has run</p>
    <div class="settings-chips">
      <button
        v-for="hours in LONG_RUN_HOUR_OPTIONS"
        :key="hours"
        class="theme-chip"
        :class="{ active: settings.timer.longRunHours === hours }"
        type="button"
        @click="update('timer', { longRunHours: hours })"
      >
        {{ longRunLabel(hours) }}
      </button>
    </div>

    <p class="settings-group-hint">Ask what to do after I was away for</p>
    <div class="settings-chips">
      <button
        v-for="minutes in IDLE_RETURN_MINUTE_OPTIONS"
        :key="minutes"
        class="theme-chip"
        :class="{ active: settings.timer.idleReturnMinutes === minutes }"
        type="button"
        @click="update('timer', { idleReturnMinutes: minutes })"
      >
        {{ idleLabel(minutes) }}
      </button>
    </div>

    <DisclosureSection label="Advanced">
      <p class="sidebar-caption">Breaks</p>

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

      <p class="sidebar-caption">Default rate</p>

      <p class="settings-group-hint">
        Projects and tasks bill at their own rate when they have one. This is
        the fallback for everything else. Zero keeps it out of the way.
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
    </DisclosureSection>

    <button
      class="btn btn-ghost settings-reset"
      type="button"
      @click="resetSection('timer')"
    >
      Reset timer
    </button>
  </div>
</template>
