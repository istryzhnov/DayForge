<script setup lang="ts">
import ProfileAvatar from './ProfileAvatar.vue'
import { useProfile } from '../composables/useProfile'
import { useProfilePanel } from '../composables/useProfilePanel'

const { auth, status, initial, avatarUrl, stateLabel, triggerTitle } =
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
    <ProfileAvatar
      :avatar-url="avatarUrl"
      :initial="initial"
      :signed-in="auth.isSignedIn.value"
    />
    <span class="sidebar-profile__text">
      <strong>{{
        auth.isSignedIn.value ? auth.displayName.value : 'Sign in'
      }}</strong>
      <span>{{
        auth.isSignedIn.value ? stateLabel : 'Sync across devices'
      }}</span>
    </span>
  </button>
</template>
