<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ProfileAvatar from './ProfileAvatar.vue'
import { useProfile } from '../composables/useProfile'
import { useProfilePanel } from '../composables/useProfilePanel'

const { t } = useI18n()
const { auth, status, initial, avatarUrl, syncSummary, triggerTitle } =
  useProfile()
const { isOpen, open } = useProfilePanel()
</script>

<template>
  <button
    class="sidebar-profile"
    :class="[
      { 'is-active': isOpen, 'is-signed-in': auth.isSignedIn.value },
      `is-${status.state}`,
    ]"
    type="button"
    aria-haspopup="dialog"
    :aria-expanded="isOpen"
    :title="triggerTitle"
    @click="open"
  >
    <span class="sidebar-profile__avatar">
      <ProfileAvatar
        :avatar-url="avatarUrl"
        :initial="initial"
        :signed-in="auth.isSignedIn.value"
      />
      <span
        v-if="auth.isSignedIn.value"
        class="sync-dot sidebar-profile__dot"
        :class="`is-${status.state}`"
        :title="syncSummary"
        aria-hidden="true"
      ></span>
    </span>
    <span class="sidebar-profile__text">
      <strong>{{
        auth.isSignedIn.value ? auth.displayName.value : t('profile.signIn')
      }}</strong>
      <span>{{
        auth.isSignedIn.value
          ? auth.user.value?.email
          : t('profile.syncAcrossDevices')
      }}</span>
    </span>
  </button>
</template>
