<script setup lang="ts">
import { useSettings } from '../../../composables/useSettings'
import { MINUTE_STEPS } from '../composables/settingsOptions'
import {
  checkedValue,
  fractionValue,
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
</script>

<template>
  <div class="settings-section">
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

    <p class="sidebar-caption">Warn me this far ahead</p>
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

    <p class="sidebar-caption">Sound</p>

    <label class="settings-toggle">
      <input
        type="checkbox"
        :checked="settings.notifications.sound"
        @change="update('notifications', { sound: checkedValue($event) })"
      />
      <span>
        <strong>Play a chime</strong>
        <em>Alongside the popup.</em>
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

    <p class="sidebar-caption">Quiet hours</p>

    <label class="settings-toggle">
      <input
        type="checkbox"
        :checked="settings.notifications.quietHours"
        @change="update('notifications', { quietHours: checkedValue($event) })"
      />
      <span>
        <strong>Stay silent overnight</strong>
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

    <button
      class="btn btn-ghost settings-reset"
      type="button"
      @click="resetSection('notifications')"
    >
      Reset reminders
    </button>
  </div>
</template>
