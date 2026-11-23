<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '../../../shared/ui/AppIcon.vue'
import ProjectIcon from '../../../shared/ui/ProjectIcon.vue'
import { formatHoursMinutes } from '../../../shared/composables/timer/format'
import { durationWords } from '../../../shared/composables/timer/text'
import { useGoalPanelHeader } from '../composables/useGoalPanelHeader'
import { useToday } from '../../../shared/composables/goalSpace/today'
import {
  capitalizeFirst,
  panelDateLabel,
} from '../../../shared/composables/panelDateLabel'
import type { PanelStats } from '../composables/projectPanelStats'
import ProjectToolbar from './ProjectToolbar.vue'
import ProjectBudgetChip from './ProjectBudgetChip.vue'
import type { BudgetStanding } from '../../../shared/composables/billing/projectBudget'

const props = defineProps<{
  title: string
  /** Project colour for the dot or icon; absent in All Projects mode. */
  color?: string
  /** The project's icon, drawn in its colour in place of the dot. */
  icon?: string
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

/** Today's date over the heading; only the phone layout shows it. */
const today = useToday()
const todayLine = computed(() =>
  capitalizeFirst(
    panelDateLabel(today.value, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
  ),
)
</script>

<template>
  <header class="goal-panel-header">
    <div class="goal-panel-header__main">
      <!-- The project's dot or icon sits in a glass tile tinted by its colour. -->
      <span
        v-if="color"
        class="goal-panel-header__tile"
        :style="{ '--project-color': color, color }"
        aria-hidden="true"
      >
        <ProjectIcon
          v-if="icon"
          class="goal-panel-header__project-icon"
          :icon="icon"
          :style="{ color }"
        />
        <span v-else class="goal-panel-header__dot" />
      </span>

      <div class="goal-panel-header__text">
        <p class="goal-panel-header__date">{{ todayLine }}</p>
        <div class="goal-panel-header__title">
          <h1>{{ title }}</h1>
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
          <li
            v-if="stats.earnedToday !== null"
            class="goal-panel-stats__item goal-panel-stats__item--money"
          >
            <span class="ui-oneline">{{
              t('goals.earnedToday', { amount: stats.earnedToday })
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
                time: formatHoursMinutes(stats.trackedMs, durationWords()),
              })
            }}</span>
          </li>
        </ul>
      </div>
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
