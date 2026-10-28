<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppIcon from '../../../components/AppIcon.vue'
import { formatHoursMinutes } from '../../../composables/timer/format'
import { useGoalPanelHeader } from '../composables/useGoalPanelHeader'
import type { PanelStats } from '../composables/projectPanelStats'
import ProjectToolbar from './ProjectToolbar.vue'
import ProjectBudgetChip from './ProjectBudgetChip.vue'
import type { BudgetStanding } from '../../analytics/composables/projectBudget'

const props = defineProps<{
  title: string
  /** Project colour for the dot; absent in All Projects mode. */
  color?: string
  status: string
  stats: PanelStats
  /** Label of a day other than today that the list is showing. */
  viewedDay: string | null
  showSettings: boolean
  showToolbar: boolean
  boardEnabled: boolean
  hasNotes: boolean
  notesOpen: boolean
  budget: BudgetStanding | null
}>()

const emit = defineEmits<{
  (e: 'set-board', enabled: boolean): void
  (e: 'toggle-notes'): void
  (e: 'today'): void
}>()

const { t } = useI18n()
const { statusBadge, isProjectSettingsOpen, toggleProjectSettings } =
  useGoalPanelHeader(props)
</script>

<template>
  <header class="goal-panel-header">
    <div class="goal-panel-header__main">
      <div class="goal-panel-header__title">
        <span
          v-if="color"
          class="goal-panel-header__dot"
          :style="{ background: color }"
          aria-hidden="true"
        />
        <h2>{{ title }}</h2>
        <span v-if="statusBadge" class="goal-status">{{ statusBadge }}</span>
      </div>

      <!-- Picking a day in Upcoming shows that day; this is the way back. -->
      <button
        v-if="viewedDay"
        class="ui-chip is-active goal-panel-header__day"
        type="button"
        :aria-label="t('goals.showingDay', { day: viewedDay })"
        @click="emit('today')"
      >
        <AppIcon name="calendar" :size="14" />
        {{ viewedDay }}
        <AppIcon name="close" :size="14" />
      </button>

      <ul class="goal-panel-stats">
        <li class="goal-panel-stats__item">
          <AppIcon name="check" :size="14" />
          <span class="ui-oneline">{{
            t('goals.todayStat', {
              done: stats.todayDone,
              total: stats.todayTotal,
            })
          }}</span>
        </li>
        <li v-if="stats.streakDays !== null" class="goal-panel-stats__item">
          <AppIcon name="flame" :size="14" />
          <span class="ui-oneline">{{
            t('goals.streakDays', stats.streakDays)
          }}</span>
        </li>
        <li v-if="stats.trackedMs > 0" class="goal-panel-stats__item">
          <AppIcon name="timer" :size="14" />
          <span class="ui-oneline">{{
            t('goals.trackedThisMonth', {
              time: formatHoursMinutes(stats.trackedMs),
            })
          }}</span>
        </li>
      </ul>
    </div>

    <div class="goal-panel-header__aside">
      <ProjectBudgetChip v-if="budget" :standing="budget" />
      <ProjectToolbar
        v-if="showToolbar"
        :board-enabled="boardEnabled"
        :has-notes="hasNotes"
        :notes-open="notesOpen"
        @set-board="(enabled) => emit('set-board', enabled)"
        @toggle-notes="emit('toggle-notes')"
      />
      <button
        v-if="showSettings"
        class="ui-icon-btn ui-icon-btn--outlined goal-panel-header__icon"
        :class="{ 'is-active': isProjectSettingsOpen }"
        type="button"
        :aria-label="t('goals.projectSettings')"
        :title="t('goals.projectSettingsHint')"
        :aria-expanded="isProjectSettingsOpen"
        @click="toggleProjectSettings"
      >
        <AppIcon name="settings" :size="16" />
      </button>
    </div>
  </header>
</template>
