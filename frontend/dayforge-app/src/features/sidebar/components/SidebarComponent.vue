<script setup lang="ts">
import { computed } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { ID } from '../../../entities/types'
import NewGoalComponent from './NewGoalComponent.vue'
import SidebarGoalButton from './SidebarGoalButton.vue'
import GoalContextMenu from './GoalContextMenu.vue'
import { useSidebarState } from '../composables/useSidebarState'
import { useSettings } from '../../../composables/useSettings'
import {
  SETTINGS_SECTION,
  useSettingsPanel,
} from '../../settings/composables/useSettingsPanel'

defineProps<{
  goals: Goal[]
  activeGoalId: ID | null
  taskCountByGoal: Record<ID, number>
  totalTaskCount: number
  /** Per-project colours, so a themed project keeps its colour in this list. */
  goalVarsById: Record<ID, Record<string, string>>
  activeView: 'goals' | 'calendar' | 'planned' | 'archive'
  plannedCount: number
  doneCount: number
  notificationsSupported: boolean
  notificationsEnabled: boolean
}>()

const emit = defineEmits<{
  (e: 'select-goal', goalId: ID | null): void
  (e: 'create-goal', title: string, description: string): void
  (e: 'select-view', view: 'goals' | 'calendar' | 'planned' | 'archive'): void
  (e: 'toggle-notifications'): void
  (e: 'delete-goal', goalId: ID): void
}>()

const {
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
} = useSidebarState({
  onSelectGoal: (goalId) => emit('select-goal', goalId),
  onCreateGoal: (title, description) => emit('create-goal', title, description),
  onDeleteGoal: (goalId) => emit('delete-goal', goalId),
})

// The theme controls used to live in a dropdown here; they now open the
// settings sidebar on the right, which has room for the whole palette and for
// everything else that is configurable.
const { isOpen: isSettingsOpen, toggle: toggleSettings } = useSettingsPanel()

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
          @click="toggleSettings(SETTINGS_SECTION.THEME)"
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
      v-for="goal in goals"
      :key="goal.id"
      :goal="goal"
      :is-active="goal.id === activeGoalId"
      :task-count="taskCountByGoal[goal.id] ?? 0"
      :theme-vars="goalVarsById[goal.id]"
      @select="selectGoal(goal.id)"
      @context-menu="openGoalContextMenu"
    />
    <p class="sidebar-caption">View</p>
    <!-- Dated commitments sit outside the goals so opening a goal doesn't
         surface unrelated appointments. -->
    <button
      class="nav-goal-btn"
      :class="{ active: activeView === 'planned' }"
      @click="emit('select-view', 'planned')"
    >
      <span>Planned tasks</span>
      <span class="goal-count">{{ plannedCount }}</span>
    </button>
    <button
      class="nav-goal-btn"
      :class="{ active: activeView === 'calendar' }"
      @click="emit('select-view', 'calendar')"
    >
      <span>Calendar</span>
    </button>
    <button
      class="nav-goal-btn"
      :class="{ active: activeView === 'archive' }"
      @click="emit('select-view', 'archive')"
    >
      <span>What I did</span>
      <span class="goal-count">{{ doneCount }}</span>
    </button>
    <div class="sidebar-actions">
      <button @click="openNewGoalForm" class="btn btn-primary">New Goal</button>
      <NewGoalComponent
        v-if="showNewGoalForm"
        @submit="createGoal"
        @cancel="closeNewGoalForm"
      />
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
