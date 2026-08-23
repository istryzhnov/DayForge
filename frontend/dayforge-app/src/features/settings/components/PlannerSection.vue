<script setup lang="ts">
import { LOCALE_OPTIONS, useSettings } from '../../../composables/useSettings'
import type { LocaleId } from '../../../composables/useSettings'
import {
  CLOCK_OPTIONS,
  MINUTE_STEPS,
  PRIORITY_OPTIONS,
  START_VIEW_OPTIONS,
  TASK_DURATIONS,
  WEEK_START_OPTIONS,
} from '../composables/settingsOptions'
import {
  checkedValue,
  fractionValue,
  rangeValue,
  textValue,
} from '../../../composables/inputValue'

defineProps<{
  notificationsSupported: boolean
  notificationsEnabled: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-notifications'): void
}>()

const { settings, update, resetSection } = useSettings()

function resetPlanner() {
  resetSection('notifications')
  resetSection('calendar')
  resetSection('behavior')
  resetSection('format')
}
</script>

<template>
  <div class="settings-section">
    <!-- Reminders ---------------------------------------------------------- -->
    <p class="sidebar-caption">Reminders</p>

    <label v-if="notificationsSupported" class="settings-toggle">
      <input
        type="checkbox"
        :checked="notificationsEnabled"
        @change="emit('toggle-notifications')"
      />
      <span>
        <strong>Remind me before a task starts</strong>
        <em>Needs the browser's notification permission.</em>
      </span>
    </label>
    <p v-else class="settings-group-hint">
      This browser has no notification support, so reminders stay off.
    </p>

    <p class="settings-group-hint">Warn me this far ahead</p>
    <div class="settings-chips">
      <button
        v-for="minutes in MINUTE_STEPS"
        :key="minutes"
        class="theme-chip"
        :class="{ active: settings.notifications.leadMinutes === minutes }"
        type="button"
        @click="update('notifications', { leadMinutes: minutes })"
      >
        {{ minutes }} min
      </button>
    </div>

    <label class="settings-toggle">
      <input
        type="checkbox"
        :checked="settings.notifications.sound"
        @change="update('notifications', { sound: checkedValue($event) })"
      />
      <span>
        <strong>Sound</strong>
        <em>A short chime alongside the popup.</em>
      </span>
    </label>

    <label v-if="settings.notifications.sound" class="settings-slider">
      <span>
        Volume
        <em>{{ Math.round(settings.notifications.volume * 100) }}%</em>
      </span>
      <input
        type="range"
        min="0"
        max="100"
        step="5"
        :value="Math.round(settings.notifications.volume * 100)"
        @input="update('notifications', { volume: fractionValue($event) })"
      />
    </label>

    <label class="settings-toggle">
      <input
        type="checkbox"
        :checked="settings.notifications.repeatAlert"
        @change="update('notifications', { repeatAlert: checkedValue($event) })"
      />
      <span>
        <strong>Keep chiming until acknowledged</strong>
        <em>Off means one chime and the popup waits quietly.</em>
      </span>
    </label>

    <label class="settings-toggle">
      <input
        type="checkbox"
        :checked="settings.notifications.quietHours"
        @change="update('notifications', { quietHours: checkedValue($event) })"
      />
      <span>
        <strong>Quiet hours</strong>
        <em>Nothing is queued during this window, not even held back.</em>
      </span>
    </label>

    <div v-if="settings.notifications.quietHours" class="settings-times">
      <label>
        From
        <input
          type="time"
          :value="settings.notifications.quietFrom"
          @change="update('notifications', { quietFrom: textValue($event) })"
        />
      </label>
      <label>
        To
        <input
          type="time"
          :value="settings.notifications.quietTo"
          @change="update('notifications', { quietTo: textValue($event) })"
        />
      </label>
    </div>

    <!-- Calendar ----------------------------------------------------------- -->
    <p class="sidebar-caption">Calendar</p>
    <p class="settings-group-hint">
      The grid always covers a full 00:00–24:00 day, so a task can never be
      scheduled somewhere it cannot be seen.
    </p>

    <p class="settings-group-hint">Snap dragging to</p>
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

    <p class="settings-group-hint">New task lasts</p>
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
        Default start
        <input
          type="time"
          :value="settings.calendar.defaultStartTime"
          @change="update('calendar', { defaultStartTime: textValue($event) })"
        />
      </label>
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

    <p class="settings-group-hint">Week starts on</p>
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

    <!-- Behaviour ---------------------------------------------------------- -->
    <p class="sidebar-caption">Behaviour</p>

    <p class="settings-group-hint">Open on start</p>
    <div class="settings-chips">
      <button
        v-for="option in START_VIEW_OPTIONS"
        :key="option.id"
        class="theme-chip"
        :class="{ active: settings.behavior.startView === option.id }"
        type="button"
        @click="update('behavior', { startView: option.id })"
      >
        {{ option.label }}
      </button>
    </div>

    <p class="settings-group-hint">New items are</p>
    <div class="settings-chips">
      <button
        v-for="option in PRIORITY_OPTIONS"
        :key="option.id"
        class="theme-chip"
        :class="{ active: settings.behavior.defaultPriority === option.id }"
        type="button"
        @click="update('behavior', { defaultPriority: option.id })"
      >
        {{ option.label }}
      </button>
    </div>

    <label class="settings-toggle">
      <input
        type="checkbox"
        :checked="settings.behavior.carryForward"
        @change="update('behavior', { carryForward: checkedValue($event) })"
      />
      <span>
        <strong>Carry unfinished tasks forward</strong>
        <em>
          Off leaves an undated task on the day it was made instead of moving it
          to today.
        </em>
      </span>
    </label>

    <label class="settings-toggle">
      <input
        type="checkbox"
        :checked="settings.behavior.autoSelectFirstGoal"
        @change="
          update('behavior', { autoSelectFirstGoal: checkedValue($event) })
        "
      />
      <span>
        <strong>Open the first project on load</strong>
        <em>Off starts on "All Projects", with nothing filtered out.</em>
      </span>
    </label>

    <label class="settings-slider">
      <span>
        Undo window
        <em>{{ settings.behavior.undoWindowSeconds }}s</em>
      </span>
      <input
        type="range"
        min="3"
        max="60"
        step="1"
        :value="settings.behavior.undoWindowSeconds"
        @input="update('behavior', { undoWindowSeconds: rangeValue($event) })"
      />
      <small>How long a delete stays reversible.</small>
    </label>

    <!-- Formats ------------------------------------------------------------ -->
    <p class="sidebar-caption">Dates and times</p>
    <p class="settings-group-hint">
      Formatting only — the interface text itself is still English.
    </p>

    <label class="settings-select">
      <span>Date language</span>
      <select
        :value="settings.format.locale"
        @change="update('format', { locale: textValue($event) as LocaleId })"
      >
        <option
          v-for="option in LOCALE_OPTIONS"
          :key="option.id"
          :value="option.id"
        >
          {{ option.label }}
        </option>
      </select>
    </label>

    <div class="settings-chips">
      <button
        v-for="option in CLOCK_OPTIONS"
        :key="option.id"
        class="theme-chip"
        :class="{ active: settings.format.clock === option.id }"
        type="button"
        @click="update('format', { clock: option.id })"
      >
        {{ option.label }}
      </button>
    </div>

    <button
      class="btn btn-ghost settings-reset"
      type="button"
      @click="resetPlanner"
    >
      Reset planner settings
    </button>
  </div>
</template>
