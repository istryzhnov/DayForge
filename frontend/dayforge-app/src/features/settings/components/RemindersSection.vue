<script setup lang="ts">
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
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

const { t } = useI18n()
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
        <strong>{{ t('settings.remindersLabel') }}</strong>
        <em>{{ t('settings.remindersPermission') }}</em>
      </span>
    </label>
    <p v-else class="settings-group-hint">
      {{ t('settings.remindersNoSupport') }}
    </p>

    <p class="sidebar-caption">{{ t('settings.remindersLeadCaption') }}</p>
    <div class="settings-chips">
      <button
        v-for="minutes in MINUTE_STEPS"
        :key="minutes"
        class="theme-chip"
        :class="{ active: settings.notifications.leadMinutes === minutes }"
        type="button"
        @click="update('notifications', { leadMinutes: minutes })"
      >
        {{ t('settings.minutesShort', { n: minutes }) }}
      </button>
    </div>

    <p class="sidebar-caption">{{ t('settings.remindersPlannedCaption') }}</p>
    <p class="settings-group-hint">
      {{ t('settings.remindersPlannedHint') }}
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
        <strong>{{ t('settings.remindersLateLabel') }}</strong>
        <em>{{ t('settings.remindersLateHint') }}</em>
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
        <strong>{{ t('settings.remindersEveningLabel') }}</strong>
        <em>
          {{
            t('settings.remindersEveningHint', {
              time: settings.notifications.endOfDayTime,
            })
          }}
        </em>
      </span>
    </label>

    <div v-if="settings.notifications.endOfDayNudge" class="settings-times">
      <label>
        {{ t('settings.remindersSummaryAt') }}
        <input
          type="time"
          :value="settings.notifications.endOfDayTime"
          @change="update('notifications', { endOfDayTime: textValue($event) })"
        />
      </label>
    </div>

    <template v-if="isSignedIn">
      <p class="sidebar-caption">
        {{ t('settings.remindersWhenClosedCaption') }}
      </p>

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
            <strong>{{ t('settings.remindersPushLabel') }}</strong>
            <em>{{ t('settings.remindersPushHint') }}</em>
          </span>
        </label>
        <p v-if="push.status.value === 'denied'" class="settings-group-hint">
          {{ t('settings.remindersBlocked') }}
        </p>
        <p v-if="push.error.value" class="settings-group-hint" role="alert">
          {{ push.error.value }}
        </p>
      </template>
    </template>

    <p class="sidebar-caption">{{ t('settings.remindersSoundCaption') }}</p>

    <label class="settings-toggle">
      <input
        type="checkbox"
        :checked="settings.notifications.sound"
        @change="update('notifications', { sound: checkedValue($event) })"
      />
      <span>
        <strong>{{ t('settings.remindersChime') }}</strong>
        <em>{{ t('settings.remindersChimeHint') }}</em>
      </span>
    </label>

    <DisclosureSection :label="t('settings.advanced')">
      <label v-if="settings.notifications.sound" class="settings-slider">
        <span>
          {{ t('settings.remindersVolume') }}
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
          <strong>{{ t('settings.remindersRepeat') }}</strong>
          <em>{{ t('settings.remindersRepeatHint') }}</em>
        </span>
      </label>

      <p class="sidebar-caption">{{ t('settings.remindersQuietCaption') }}</p>

      <label class="settings-toggle">
        <input
          type="checkbox"
          :checked="settings.notifications.quietHours"
          @change="
            update('notifications', { quietHours: checkedValue($event) })
          "
        />
        <span>
          <strong>{{ t('settings.remindersQuiet') }}</strong>
          <em>{{ t('settings.remindersQuietHint') }}</em>
        </span>
      </label>

      <div v-if="settings.notifications.quietHours" class="settings-times">
        <label>
          {{ t('settings.remindersFrom') }}
          <input
            type="time"
            :value="settings.notifications.quietFrom"
            @change="update('notifications', { quietFrom: textValue($event) })"
          />
        </label>
        <label>
          {{ t('settings.remindersTo') }}
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
      {{ t('settings.remindersReset') }}
    </button>
  </div>
</template>
