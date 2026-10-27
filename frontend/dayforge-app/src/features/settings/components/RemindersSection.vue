<script setup lang="ts">
import { watch } from 'vue'
import DisclosureSection from '../../../components/DisclosureSection.vue'
import { useSettings } from '../../../composables/useSettings'
import { MINUTE_STEPS } from '../composables/settingsOptions'
import {
  checkedValue,
  fractionValue,
  textValue,
} from '../../../composables/inputValue'
import { useAuth } from '../../../composables/useAuth'
import { usePushReminders } from '../../../composables/usePushReminders'

defineProps<{
  notificationsSupported: boolean
  notificationsEnabled: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-notifications'): void
}>()

const { settings, update, resetSection } = useSettings()
const { user, isSignedIn } = useAuth()
const push = usePushReminders()

watch(
  () => user.value?.id,
  (userId) => {
    if (userId) void push.refresh(userId)
  },
  { immediate: true },
)

function togglePush() {
  const userId = user.value?.id
  if (!userId) return
  if (push.status.value === 'on') {
    void push.disable()
  } else {
    void push.enable(userId)
  }
}
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

    <p class="sidebar-caption">Planned blocks</p>
    <p class="settings-group-hint">
      In the app, these show while DayForge is open. Turn on "Notify me when the
      app is closed" to get them as push notifications too.
    </p>

    <label class="settings-toggle">
      <input
        type="checkbox"
        :checked="settings.notifications.plannedStartReminder"
        @change="
          update('notifications', {
            plannedStartReminder: checkedValue($event),
          })
        "
      />
      <span>
        <strong>Ask to start the timer on a late block</strong>
        <em> When a scheduled block began 5 min ago with no timer running. </em>
      </span>
    </label>

    <label class="settings-toggle">
      <input
        type="checkbox"
        :checked="settings.notifications.endOfDayNudge"
        @change="
          update('notifications', { endOfDayNudge: checkedValue($event) })
        "
      />
      <span>
        <strong>Evening nudge to log planned blocks</strong>
        <em>
          After {{ settings.notifications.endOfDayTime }}, once a day, if
          finished blocks have no time logged.
        </em>
      </span>
    </label>

    <div v-if="settings.notifications.endOfDayNudge" class="settings-times">
      <label>
        Summary at
        <input
          type="time"
          :value="settings.notifications.endOfDayTime"
          @change="update('notifications', { endOfDayTime: textValue($event) })"
        />
      </label>
    </div>

    <template v-if="isSignedIn">
      <p class="sidebar-caption">When the app is closed</p>

      <p
        v-if="
          push.status.value === 'unavailable' ||
          push.status.value === 'ios-install'
        "
        class="settings-group-hint"
      >
        {{ push.reason.value }}
      </p>

      <template v-else>
        <label class="settings-toggle">
          <input
            type="checkbox"
            :checked="push.status.value === 'on'"
            :disabled="push.busy.value"
            @change="togglePush"
          />
          <span>
            <strong>Notify me when the app is closed</strong>
            <em>
              Timer and planned-block reminders arrive as browser notifications.
              They are checked every few minutes, so they can come a little
              late. Works on this device only.
            </em>
          </span>
        </label>
        <p v-if="push.status.value === 'denied'" class="settings-group-hint">
          Notifications are blocked for this site in the browser settings.
        </p>
        <p v-if="push.error.value" class="settings-group-hint" role="alert">
          {{ push.error.value }}
        </p>
      </template>
    </template>

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

    <DisclosureSection label="Advanced">
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
          @change="
            update('notifications', { repeatAlert: checkedValue($event) })
          "
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
          @change="
            update('notifications', { quietHours: checkedValue($event) })
          "
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
    </DisclosureSection>

    <button
      class="btn btn-ghost settings-reset"
      type="button"
      @click="resetSection('notifications')"
    >
      Reset reminders
    </button>
  </div>
</template>
