<script setup lang="ts">
import { computed } from 'vue'
import type { ActiveView } from '../../../pages/composables/useMainPageState'
import ProfileAvatar from '../../profile/components/ProfileAvatar.vue'
import { useProfile } from '../../profile/composables/useProfile'
import { useProfilePanel } from '../../profile/composables/useProfilePanel'
import { useMobileNav } from '../composables/useMobileNav'
import { useTimer } from '../../../composables/useTimer'
import { useHotkeyOverlay } from '../../../composables/useHotkeys'
import { SYNC_STATE } from '../../../sync/types'

const props = defineProps<{
  activeView: ActiveView
  goalTitle: string | null
}>()

const emit = defineEmits<{ (e: 'open-timer'): void }>()

const VIEW_TITLES: Record<Exclude<ActiveView, 'goals'>, string> = {
  calendar: 'Calendar',
  planned: 'Planned tasks',
  archive: 'What I did',
  timer: 'Timer',
  analytics: 'Analytics',
}

const { isOpen: isNavOpen, open: openNav } = useMobileNav()
const { isOpen: isProfileOpen, open: openProfile } = useProfilePanel()
const { auth, status, initial, avatarUrl, triggerTitle } = useProfile()
const { isLive, displayLabel } = useTimer()
const { openQuickAdd } = useHotkeyOverlay()

const title = computed(() => {
  if (props.activeView === 'goals') return props.goalTitle ?? 'All Projects'
  return VIEW_TITLES[props.activeView]
})

const showSyncDot = computed(() => status.value.state !== SYNC_STATE.OFF)
</script>

<template>
  <header class="mobile-topbar">
    <button
      class="mobile-topbar__btn"
      type="button"
      aria-label="Open navigation"
      aria-controls="app-sidebar"
      :aria-expanded="isNavOpen"
      @click="openNav"
    >
      <span aria-hidden="true">☰</span>
    </button>

    <p class="mobile-topbar__title">{{ title }}</p>

    <div class="mobile-topbar__end">
      <button
        v-if="isLive"
        class="mobile-topbar__timer"
        type="button"
        :aria-label="`Open timer, ${displayLabel} on the clock`"
        @click="emit('open-timer')"
      >
        <span class="mobile-topbar__timer-dot" aria-hidden="true"></span>
        <span>{{ displayLabel }}</span>
      </button>

      <button
        class="mobile-topbar__btn"
        type="button"
        aria-label="Quick add task"
        title="Quick add task"
        @click="openQuickAdd"
      >
        <span aria-hidden="true">+</span>
      </button>

      <button
        class="mobile-topbar__btn mobile-topbar__profile"
        :class="{ 'is-active': isProfileOpen }"
        type="button"
        aria-haspopup="dialog"
        :aria-expanded="isProfileOpen"
        :aria-label="triggerTitle"
        :title="triggerTitle"
        @click="openProfile"
      >
        <ProfileAvatar
          :avatar-url="avatarUrl"
          :initial="initial"
          :signed-in="auth.isSignedIn.value"
        />
        <span
          v-if="showSyncDot"
          class="sync-dot mobile-topbar__sync"
          :class="`is-${status.state}`"
          aria-hidden="true"
        ></span>
      </button>
    </div>
  </header>
</template>
