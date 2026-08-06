<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { ID } from '../../../entities/types'
import NewGoalComponent from './NewGoalComponent.vue'
import { useSidebarState } from '../composables/useSidebarState'
import type { ThemeMode, ThemeStyle } from '../../../composables/useTheme'

defineProps<{
  goals: Goal[]
  activeGoalId: ID | null
  taskCountByGoal: Record<ID, number>
  totalTaskCount: number
  themeStyle: ThemeStyle
  themeMode: ThemeMode
}>()

const emit = defineEmits<{
  (e: 'select-goal', goalId: ID | null): void
  (e: 'create-goal', title: string, description: string): void
  (e: 'change-theme-style', style: ThemeStyle): void
  (e: 'change-theme-mode', mode: ThemeMode): void
}>()

const {
  showNewGoalForm,
  openNewGoalForm,
  closeNewGoalForm,
  selectGoal,
  createGoal,
} = useSidebarState({
  onSelectGoal: (goalId) => emit('select-goal', goalId),
  onCreateGoal: (title, description) => emit('create-goal', title, description),
})

const showSettings = ref(false)
const settingsRef = ref<HTMLElement | null>(null)

function toggleSettings() {
  showSettings.value = !showSettings.value
}

function handleOutsideClick(event: MouseEvent) {
  if (
    showSettings.value &&
    settingsRef.value &&
    !settingsRef.value.contains(event.target as Node)
  ) {
    showSettings.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', handleOutsideClick))
onUnmounted(() => document.removeEventListener('mousedown', handleOutsideClick))
</script>

<template>
  <div class="sidebar-shell">
    <div class="sidebar-brand">
      <span class="brand-dot"></span>
      <strong>DayForge</strong>
      <div ref="settingsRef" class="sidebar-settings">
        <button
          class="sidebar-settings__trigger"
          type="button"
          aria-label="Settings"
          @click="toggleSettings"
        >
          ⚙
        </button>

        <section v-if="showSettings" class="theme-panel">
          <p class="sidebar-caption">Theme</p>
          <div class="theme-panel__group">
            <button
              class="theme-chip"
              :class="{ active: themeStyle === 'vivid' }"
              @click="emit('change-theme-style', 'vivid')"
            >
              Fresh
            </button>
            <button
              class="theme-chip"
              :class="{ active: themeStyle === 'minimal' }"
              @click="emit('change-theme-style', 'minimal')"
            >
              Minimal
            </button>
          </div>
          <div class="theme-panel__group">
            <button
              class="theme-chip"
              :class="{ active: themeMode === 'light' }"
              @click="emit('change-theme-mode', 'light')"
            >
              Day
            </button>
            <button
              class="theme-chip"
              :class="{ active: themeMode === 'dark' }"
              @click="emit('change-theme-mode', 'dark')"
            >
              Night
            </button>
          </div>
        </section>
      </div>
    </div>

    <p class="sidebar-caption">Goals</p>

    <button
      class="nav-goal-btn"
      :class="{ active: activeGoalId === null }"
      @click="selectGoal(null)"
    >
      <span>All Goals</span>
      <span class="goal-count">{{ totalTaskCount }}</span>
    </button>

    <button
      v-for="goal in goals"
      :key="goal.id"
      class="nav-goal-btn"
      :class="{ active: goal.id === activeGoalId }"
      @click="selectGoal(goal.id)"
    >
      <span>{{ goal.title }}</span>
      <span class="goal-count">{{ taskCountByGoal[goal.id] ?? 0 }}</span>
    </button>
    <div class="sidebar-actions">
      <button @click="openNewGoalForm" class="btn btn-primary">New Goal</button>
      <NewGoalComponent
        v-if="showNewGoalForm"
        @submit="createGoal"
        @cancel="closeNewGoalForm"
      />
    </div>
  </div>
</template>
