<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { ID } from '../../../entities/types'
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
  (e: 'create-goal', title: string, description: string): void
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
  onCreateGoal: (title, description) => emit('create-goal', title, description),
  onDeleteGoal: (goalId) => emit('delete-goal', goalId),
})

const { isOpen: isSettingsOpen, toggle: toggleSettings } = useSettingsPanel()
const { open: openProfile } = useProfilePanel()
const { isOpen: isMobileNavOpen, close: closeMobileNav } = useMobileNav()

function chooseView(view: ActiveView) {
  emit('select-view', view)
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
</script>

<template>
  <div class="sidebar-shell">
    <div class="sidebar-brand">
      <span class="brand-dot"></span>
      <strong>DayForge</strong>
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
        {{ notificationsEnabled ? '🔔' : '🔕' }}
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
          ⚙
        </button>
      </div>
    </div>

    <p class="sidebar-caption">Projects</p>

    <button
      class="nav-goal-btn"
      :class="{ active: activeGoalId === null }"
      @click="selectGoal(null)"
    >
      <span>All Projects</span>
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
            {{ showArchived ? '▾' : '▸' }}
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
      @click="chooseView('calendar')"
    >
      <span class="nav-goal-btn__main">
        <span class="nav-goal-btn__icon" aria-hidden="true">📅</span>
        <span>Calendar</span>
      </span>
    </button>
    <button
      class="nav-goal-btn"
      :class="{ active: activeView === 'timer' }"
      @click="chooseView('timer')"
    >
      <span class="nav-goal-btn__main">
        <span class="nav-goal-btn__icon" aria-hidden="true">⏱️</span>
        <span>Timer</span>
      </span>
    </button>
    <button
      class="nav-goal-btn"
      :class="{ active: activeView === 'analytics' }"
      @click="chooseView('analytics')"
    >
      <span class="nav-goal-btn__main">
        <span class="nav-goal-btn__icon" aria-hidden="true">📊</span>
        <span>Analytics</span>
      </span>
    </button>
    <button
      class="nav-goal-btn"
      :class="{ active: activeView === 'planned' }"
      @click="chooseView('planned')"
    >
      <span class="nav-goal-btn__main">
        <span class="nav-goal-btn__icon" aria-hidden="true">📌</span>
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
        <span class="nav-goal-btn__icon" aria-hidden="true">✅</span>
        <span>What I did</span>
      </span>
      <span class="goal-count">{{ doneCount }}</span>
    </button>

    <TimerWidget @open-timer="chooseView('timer')" />
    <div class="sidebar-actions">
      <button @click="openNewGoalForm" class="btn btn-primary">New Goal</button>
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
