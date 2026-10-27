<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { ID } from '../../../entities/types'
import AppIcon from '../../../components/AppIcon.vue'
import BrandWordmark from '../../../components/BrandWordmark.vue'
import type { ActiveView } from '../../../pages/composables/useMainPageState'
import NewGoalComponent from './NewGoalComponent.vue'
import SidebarGoalButton from './SidebarGoalButton.vue'
import GoalContextMenu from './GoalContextMenu.vue'
import TimerWidget from '../../timer/components/TimerWidget.vue'
import SyncStatusDot from '../../sync/components/SyncStatusDot.vue'
import SidebarProfileButton from '../../profile/components/SidebarProfileButton.vue'
import type { SyncStatus } from '../../../sync/types'
import { useSidebarState } from '../composables/useSidebarState'
import { useMobileNav } from '../composables/useMobileNav'
import { useSettings } from '../../../composables/useSettings'
import { useSettingsPanel } from '../../settings/composables/useSettingsPanel'
import { useProfilePanel } from '../../profile/composables/useProfilePanel'
import {
  shortcutTitle,
  useHotkeyOverlay,
} from '../../../composables/useHotkeys'

const props = defineProps<{
  goals: Goal[]
  activeGoalId: ID | null
  taskCountByGoal: Record<ID, number>
  totalTaskCount: number
  /** Per-project colours, so a themed project keeps its colour in this list. */
  goalVarsById: Record<ID, Record<string, string>>
  activeView: ActiveView
  plannedCount: number
  doneCount: number
  notificationsSupported: boolean
  notificationsEnabled: boolean
  syncStatus: SyncStatus
}>()

const emit = defineEmits<{
  (e: 'select-goal', goalId: ID | null): void
  (e: 'create-goal', title: string, description: string, color: string): void
  (e: 'select-view', view: ActiveView): void
  (e: 'toggle-notifications'): void
  (e: 'delete-goal', goalId: ID): void
}>()

const {
  listedGoals,
  archivedGoals,
  showArchived,
  toggleArchived,
  showNewGoalForm,
  openNewGoalForm,
  closeNewGoalForm,
  selectGoal,
  createGoal,
  contextMenuGoal,
  contextMenuPos,
  openGoalContextMenu,
  closeGoalContextMenu,
  deleteGoalFromMenu,
} = useSidebarState(props, {
  onSelectGoal: (goalId) => {
    emit('select-goal', goalId)
    closeMobileNav()
  },
  onCreateGoal: (title, description, color) =>
    emit('create-goal', title, description, color),
  onDeleteGoal: (goalId) => emit('delete-goal', goalId),
})

const { isOpen: isSettingsOpen, toggle: toggleSettings } = useSettingsPanel()
const { openShortcuts, openSearch } = useHotkeyOverlay()
const { open: openProfile } = useProfilePanel()
const { isOpen: isMobileNavOpen, close: closeMobileNav } = useMobileNav()

function chooseView(view: ActiveView) {
  emit('select-view', view)
  closeMobileNav()
}

function openSearchFromNav() {
  openSearch()
  closeMobileNav()
}

function toggleSettingsFromNav() {
  toggleSettings()
  closeMobileNav()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isMobileNavOpen.value) closeMobileNav()
}

watch(isMobileNavOpen, (isOpen) => {
  document.body.classList.toggle('is-mobile-nav-open', isOpen)
})

onMounted(() => window.addEventListener('keydown', onKeydown))

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.classList.remove('is-mobile-nav-open')
})

// The tooltip quotes the configured lead time rather than a fixed "5 min".
const { settings } = useSettings()
const leadMinutes = computed(() => settings.notifications.leadMinutes)
const keyboardShortcuts = computed(() => settings.behavior.keyboardShortcuts)
</script>

<template>
  <div class="sidebar-shell">
    <div class="sidebar-brand">
      <BrandWordmark />
      <button
        v-if="notificationsSupported"
        class="sidebar-notify-trigger"
        :class="{ 'is-active': notificationsEnabled }"
        type="button"
        :aria-label="
          notificationsEnabled
            ? 'Disable task reminders'
            : 'Enable task reminders'
        "
        :title="
          notificationsEnabled
            ? `Reminders on: alerts ${leadMinutes} min before a task starts`
            : 'Enable sound reminders for upcoming tasks'
        "
        @click="emit('toggle-notifications')"
      >
        <AppIcon
          :name="notificationsEnabled ? 'bell' : 'bell-off'"
          :size="15"
        />
      </button>
      <div class="sidebar-settings">
        <button
          class="sidebar-settings__trigger"
          :class="{ 'is-active': isSettingsOpen }"
          type="button"
          aria-label="Settings"
          title="Theme, colours, planner and data"
          @click="toggleSettingsFromNav"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
            />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>
      <button
        class="sidebar-search-trigger"
        type="button"
        aria-label="Search projects and tasks"
        :title="shortcutTitle('Search projects and tasks', 'Ctrl+K or /')"
        @click="openSearchFromNav"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.4"
          stroke-linecap="round"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>
      <button
        v-if="keyboardShortcuts"
        class="sidebar-shortcuts-trigger"
        type="button"
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (?)"
        @click="openShortcuts"
      >
        ?
      </button>
    </div>

    <p class="sidebar-caption">Projects</p>

    <button
      class="nav-goal-btn"
      :class="{ active: activeGoalId === null }"
      :title="shortcutTitle('All Projects', 'G then A')"
      @click="selectGoal(null)"
    >
      <span class="nav-goal-btn__main">
        <AppIcon class="nav-goal-btn__glyph" name="grid" :size="14" />
        <span class="nav-goal-btn__name">All Projects</span>
      </span>
      <span class="goal-count">{{ totalTaskCount }}</span>
    </button>

    <SidebarGoalButton
      v-for="goal in listedGoals"
      :key="goal.id"
      :goal="goal"
      :is-active="goal.id === activeGoalId"
      :task-count="taskCountByGoal[goal.id] ?? 0"
      :theme-vars="goalVarsById[goal.id]"
      @select="selectGoal(goal.id)"
      @context-menu="openGoalContextMenu"
    />

    <template v-if="archivedGoals.length > 0">
      <button
        class="nav-goal-btn sidebar-archived-toggle"
        type="button"
        :aria-expanded="showArchived"
        @click="toggleArchived"
      >
        <span class="nav-goal-btn__main">
          <span class="nav-goal-btn__icon" aria-hidden="true">
            <AppIcon
              :name="showArchived ? 'chevron-down' : 'chevron-right'"
              :size="14"
            />
          </span>
          <span>Archived</span>
        </span>
        <span class="goal-count">{{ archivedGoals.length }}</span>
      </button>

      <SidebarGoalButton
        v-for="goal in showArchived ? archivedGoals : []"
        :key="goal.id"
        :goal="goal"
        :is-active="false"
        :is-archived="true"
        :task-count="taskCountByGoal[goal.id] ?? 0"
        :theme-vars="goalVarsById[goal.id]"
        @select="selectGoal(goal.id)"
        @context-menu="openGoalContextMenu"
      />
    </template>

    <p class="sidebar-caption">View</p>

    <button
      class="nav-goal-btn"
      :class="{ active: activeView === 'calendar' }"
      :title="shortcutTitle('Calendar', 'G then C')"
      @click="chooseView('calendar')"
    >
      <span class="nav-goal-btn__main">
        <span class="nav-goal-btn__icon" aria-hidden="true">
          <AppIcon name="calendar" :size="16" />
        </span>
        <span>Calendar</span>
      </span>
    </button>
    <button
      class="nav-goal-btn"
      :class="{ active: activeView === 'timer' }"
      :title="shortcutTitle('Timer', 'G then T')"
      @click="chooseView('timer')"
    >
      <span class="nav-goal-btn__main">
        <span class="nav-goal-btn__icon" aria-hidden="true">
          <AppIcon name="timer" :size="16" />
        </span>
        <span>Timer</span>
      </span>
    </button>
    <button
      class="nav-goal-btn"
      :class="{ active: activeView === 'analytics' }"
      :title="shortcutTitle('Analytics', 'G then Y')"
      @click="chooseView('analytics')"
    >
      <span class="nav-goal-btn__main">
        <span class="nav-goal-btn__icon" aria-hidden="true">
          <AppIcon name="chart" :size="16" />
        </span>
        <span>Analytics</span>
      </span>
    </button>
    <button
      class="nav-goal-btn"
      :class="{ active: activeView === 'planned' }"
      @click="chooseView('planned')"
    >
      <span class="nav-goal-btn__main">
        <span class="nav-goal-btn__icon" aria-hidden="true">
          <AppIcon name="pin" :size="16" />
        </span>
        <span>Planned tasks</span>
      </span>
      <span class="goal-count">{{ plannedCount }}</span>
    </button>
    <button
      class="nav-goal-btn"
      :class="{ active: activeView === 'archive' }"
      @click="chooseView('archive')"
    >
      <span class="nav-goal-btn__main">
        <span class="nav-goal-btn__icon" aria-hidden="true">
          <AppIcon name="check-square" :size="16" />
        </span>
        <span>What I did</span>
      </span>
      <span class="goal-count">{{ doneCount }}</span>
    </button>

    <TimerWidget @open-timer="chooseView('timer')" />
    <div class="sidebar-actions">
      <button class="btn btn-primary" @click="openNewGoalForm">
        New Project
      </button>
      <NewGoalComponent
        v-if="showNewGoalForm"
        @submit="createGoal"
        @cancel="closeNewGoalForm"
      />
    </div>

    <div class="sidebar-footer">
      <SyncStatusDot :status="syncStatus" @open-account="openProfile" />
      <SidebarProfileButton />
    </div>

    <GoalContextMenu
      v-if="contextMenuGoal && contextMenuPos"
      :x="contextMenuPos.x"
      :y="contextMenuPos.y"
      :goal-title="contextMenuGoal.title"
      @delete="deleteGoalFromMenu"
      @close="closeGoalContextMenu"
    />
  </div>
</template>
