<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '../../../components/AppIcon.vue'
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

/** Message keys for each non-project view's title. */
const VIEW_TITLE_KEYS: Record<Exclude<ActiveView, 'goals'>, string> = {
  calendar: 'sidebar.calendar',
  planned: 'sidebar.plannedTasks',
  archive: 'sidebar.whatIDid',
  timer: 'sidebar.timer',
  analytics: 'sidebar.analytics',
}

const { t } = useI18n()

const { isOpen: isNavOpen, open: openNav } = useMobileNav()
const { isOpen: isProfileOpen, open: openProfile } = useProfilePanel()
const { auth, status, initial, avatarUrl, triggerTitle } = useProfile()
const { isLive, displayLabel } = useTimer()
const { openQuickAdd, openSearch } = useHotkeyOverlay()

const title = computed(() => {
  if (props.activeView === 'goals')
    return props.goalTitle ?? t('sidebar.allProjects')
  return t(VIEW_TITLE_KEYS[props.activeView])
})

/** A project's name is data and may be cut; view and "All Projects" labels wrap. */
const isLabelTitle = computed(
  () => props.activeView !== 'goals' || !props.goalTitle,
)

const showSyncDot = computed(() => status.value.state !== SYNC_STATE.OFF)
</script>

<template>
  <header class="mobile-topbar">
    <button
      class="mobile-topbar__btn"
      type="button"
      :aria-label="t('sidebar.openNavigation')"
      aria-controls="app-sidebar"
      :aria-expanded="isNavOpen"
      @click="openNav"
    >
      <AppIcon name="menu" :size="20" />
    </button>

    <p
      class="mobile-topbar__title"
      :class="{ 'mobile-topbar__title--label': isLabelTitle }"
    >
      {{ title }}
    </p>

    <div class="mobile-topbar__end">
      <button
        v-if="isLive"
        class="mobile-topbar__timer"
        type="button"
        :aria-label="t('sidebar.openTimer', { time: displayLabel })"
        @click="emit('open-timer')"
      >
        <span class="mobile-topbar__timer-dot" aria-hidden="true"></span>
        <span>{{ displayLabel }}</span>
      </button>

      <button
        class="mobile-topbar__btn"
        type="button"
        :aria-label="t('sidebar.searchProjectsAndTasks')"
        :title="t('sidebar.search')"
        @click="openSearch"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>

      <button
        class="mobile-topbar__btn"
        type="button"
        :aria-label="t('sidebar.quickAddTask')"
        :title="t('sidebar.quickAddTask')"
        @click="openQuickAdd"
      >
        <AppIcon name="plus" :size="20" />
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
