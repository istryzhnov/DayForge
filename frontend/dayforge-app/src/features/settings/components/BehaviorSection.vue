<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Goal } from '../../../entities/GoalEntity'
import { GOAL_STATUS } from '../../../entities/constants'
import {
  START_VIEW,
  useSettings,
  type StartView,
} from '../../../composables/useSettings'
import { useHotkeyOverlay } from '../../../composables/useHotkeys'
import { useTips } from '../../onboarding/composables/useTips'
import { COACH_TIPS_ENABLED } from '../../onboarding/composables/tips'
import { useTour } from '../../onboarding/composables/useTour'
import { sortGoals } from '../../../composables/goalSpace/goalOrder'
import {
  PRIORITY_OPTIONS,
  START_VIEW_OPTIONS,
} from '../composables/settingsOptions'
import {
  checkedValue,
  rangeValue,
  textValue,
} from '../../../composables/inputValue'

const { t } = useI18n()

const props = defineProps<{
  goals: Goal[]
}>()

const { settings, update, resetSection } = useSettings()
const { openShortcuts } = useHotkeyOverlay()
const { tipsOff, turnOn, turnOff, resetTips } = useTips()
const { restart: restartTour } = useTour()

const startProjects = computed(() =>
  sortGoals(props.goals.filter((goal) => goal.status !== GOAL_STATUS.ARCHIVED)),
)

/** A start project that was deleted since counts as All Tasks, as on load. */
const startsOnProject = computed(
  () =>
    settings.behavior.startView === START_VIEW.GOALS &&
    props.goals.some((goal) => goal.id === settings.behavior.startGoalId),
)

/** The project chip sits right after All Tasks, the views follow. */
const otherViews = START_VIEW_OPTIONS.filter(
  (option) => option.id !== START_VIEW.GOALS,
)

function startOnAllTasks() {
  update('behavior', { startView: START_VIEW.GOALS, startGoalId: null })
}

function startOnProject(goalId = startProjects.value[0]?.id) {
  if (!goalId) return
  update('behavior', { startView: START_VIEW.GOALS, startGoalId: goalId })
}

function startOnView(view: StartView) {
  update('behavior', { startView: view })
}
</script>

<template>
  <div class="settings-section">
    <p class="ui-section-label ui-section-label--wrap">
      {{ t('settings.openOnStart') }}
    </p>
    <div class="ui-chips">
      <button
        class="ui-chip ui-chip--wrap"
        :class="{
          'is-active':
            settings.behavior.startView === START_VIEW.GOALS &&
            !startsOnProject,
        }"
        type="button"
        @click="startOnAllTasks"
      >
        {{ t('settings.viewAllTasks') }}
      </button>
      <button
        v-if="startProjects.length > 0"
        class="ui-chip ui-chip--wrap"
        :class="{ 'is-active': startsOnProject }"
        type="button"
        @click="startOnProject()"
      >
        {{ t('settings.viewAProject') }}
      </button>
      <button
        v-for="option in otherViews"
        :key="option.id"
        class="ui-chip ui-chip--wrap"
        :class="{ 'is-active': settings.behavior.startView === option.id }"
        type="button"
        @click="startOnView(option.id)"
      >
        {{ t(option.labelKey) }}
      </button>
    </div>

    <label v-if="startsOnProject" class="settings-select">
      <span>{{ t('settings.projectSelect') }}</span>
      <select
        :value="settings.behavior.startGoalId ?? ''"
        @change="startOnProject(textValue($event))"
      >
        <option v-for="goal in startProjects" :key="goal.id" :value="goal.id">
          {{ goal.title }}
        </option>
      </select>
    </label>

    <p class="ui-section-label ui-section-label--wrap">
      {{ t('settings.newItemsAre') }}
    </p>
    <div class="ui-chips">
      <button
        v-for="option in PRIORITY_OPTIONS"
        :key="option.id"
        class="ui-chip ui-chip--wrap"
        :class="{
          'is-active': settings.behavior.defaultPriority === option.id,
        }"
        type="button"
        @click="update('behavior', { defaultPriority: option.id })"
      >
        {{ t(option.labelKey) }}
      </button>
    </div>

    <p class="ui-section-label ui-section-label--wrap">
      {{ t('settings.onItsOwn') }}
    </p>

    <label class="settings-toggle ui-card">
      <input
        type="checkbox"
        :checked="settings.behavior.carryForward"
        @change="update('behavior', { carryForward: checkedValue($event) })"
      />
      <span>
        <strong>{{ t('settings.carryForward') }}</strong>
        <em>{{ t('settings.carryForwardHint') }}</em>
      </span>
    </label>

    <label class="settings-toggle ui-card">
      <input
        type="checkbox"
        :checked="settings.behavior.keyboardShortcuts"
        @change="
          update('behavior', { keyboardShortcuts: checkedValue($event) })
        "
      />
      <span>
        <strong>{{ t('settings.keyboardShortcuts') }}</strong>
        <em>{{ t('settings.keyboardShortcutsHint') }}</em>
      </span>
    </label>

    <button class="btn btn-ghost" type="button" @click="openShortcuts">
      {{ t('settings.showShortcuts') }}
    </button>

    <label v-if="COACH_TIPS_ENABLED" class="settings-toggle ui-card">
      <input
        type="checkbox"
        :checked="!tipsOff"
        @change="checkedValue($event) ? turnOn() : turnOff()"
      />
      <span>
        <strong>{{ t('settings.tips') }}</strong>
        <em>{{ t('settings.tipsHint') }}</em>
      </span>
    </label>

    <button
      v-if="COACH_TIPS_ENABLED"
      class="btn btn-ghost"
      type="button"
      @click="resetTips"
    >
      {{ t('settings.showTipsAgain') }}
    </button>

    <button class="btn btn-ghost" type="button" @click="restartTour">
      {{ t('settings.takeTourAgain') }}
    </button>

    <label class="settings-slider ui-card">
      <span>
        {{ t('settings.undoWindow') }}
        <em>{{
          t('settings.undoSeconds', { n: settings.behavior.undoWindowSeconds })
        }}</em>
      </span>
      <input
        type="range"
        min="3"
        max="60"
        step="1"
        :value="settings.behavior.undoWindowSeconds"
        @input="update('behavior', { undoWindowSeconds: rangeValue($event) })"
      />
      <small>{{ t('settings.undoWindowHint') }}</small>
    </label>

    <button
      class="btn btn-ghost settings-reset"
      type="button"
      @click="resetSection('behavior')"
    >
      {{ t('settings.resetBehaviour') }}
    </button>
  </div>
</template>
