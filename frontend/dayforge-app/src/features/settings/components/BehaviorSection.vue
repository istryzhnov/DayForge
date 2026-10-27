<script setup lang="ts">
import { computed } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import { GOAL_STATUS } from '../../../entities/constants'
import {
  START_VIEW,
  useSettings,
  type StartView,
} from '../../../composables/useSettings'
import { useHotkeyOverlay } from '../../../composables/useHotkeys'
import { useTips } from '../../onboarding/composables/useTips'
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

const props = defineProps<{
  goals: Goal[]
}>()

const { settings, update, resetSection } = useSettings()
const { openShortcuts } = useHotkeyOverlay()
const { tipsOff, turnOn, turnOff, resetTips } = useTips()

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
    <p class="sidebar-caption">Open on start</p>
    <div class="settings-chips">
      <button
        class="theme-chip"
        :class="{
          active:
            settings.behavior.startView === START_VIEW.GOALS &&
            !startsOnProject,
        }"
        type="button"
        @click="startOnAllTasks"
      >
        All tasks
      </button>
      <button
        v-if="startProjects.length > 0"
        class="theme-chip"
        :class="{ active: startsOnProject }"
        type="button"
        @click="startOnProject()"
      >
        A project
      </button>
      <button
        v-for="option in otherViews"
        :key="option.id"
        class="theme-chip"
        :class="{ active: settings.behavior.startView === option.id }"
        type="button"
        @click="startOnView(option.id)"
      >
        {{ option.label }}
      </button>
    </div>

    <label v-if="startsOnProject" class="settings-select">
      <span>Project</span>
      <select
        :value="settings.behavior.startGoalId ?? ''"
        @change="startOnProject(textValue($event))"
      >
        <option v-for="goal in startProjects" :key="goal.id" :value="goal.id">
          {{ goal.title }}
        </option>
      </select>
    </label>

    <p class="sidebar-caption">New items are</p>
    <div class="settings-chips">
      <button
        v-for="option in PRIORITY_OPTIONS"
        :key="option.id"
        class="theme-chip"
        :class="{ active: settings.behavior.defaultPriority === option.id }"
        type="button"
        @click="update('behavior', { defaultPriority: option.id })"
      >
        {{ option.label }}
      </button>
    </div>

    <p class="sidebar-caption">On its own</p>

    <label class="settings-toggle">
      <input
        type="checkbox"
        :checked="settings.behavior.carryForward"
        @change="update('behavior', { carryForward: checkedValue($event) })"
      />
      <span>
        <strong>Carry unfinished tasks forward</strong>
        <em>
          Off leaves an undated task on the day it was made instead of moving it
          to today.
        </em>
      </span>
    </label>

    <label class="settings-toggle">
      <input
        type="checkbox"
        :checked="settings.behavior.keyboardShortcuts"
        @change="
          update('behavior', { keyboardShortcuts: checkedValue($event) })
        "
      />
      <span>
        <strong>Keyboard shortcuts</strong>
        <em>
          N adds a task, Space runs the timer, ? lists the rest. Off turns them
          all off.
        </em>
      </span>
    </label>

    <button class="btn btn-ghost" type="button" @click="openShortcuts">
      Show shortcuts
    </button>

    <label class="settings-toggle">
      <input
        type="checkbox"
        :checked="!tipsOff"
        @change="checkedValue($event) ? turnOn() : turnOff()"
      />
      <span>
        <strong>Tips</strong>
        <em>
          Short notes that point at the control they explain. Close one with ×,
          or turn them all off here.
        </em>
      </span>
    </label>

    <button class="btn btn-ghost" type="button" @click="resetTips">
      Show all tips again
    </button>

    <label class="settings-slider">
      <span>
        Undo window
        <em>{{ settings.behavior.undoWindowSeconds }}s</em>
      </span>
      <input
        type="range"
        min="3"
        max="60"
        step="1"
        :value="settings.behavior.undoWindowSeconds"
        @input="update('behavior', { undoWindowSeconds: rangeValue($event) })"
      />
      <small>How long a delete stays reversible.</small>
    </label>

    <button
      class="btn btn-ghost settings-reset"
      type="button"
      @click="resetSection('behavior')"
    >
      Reset behaviour
    </button>
  </div>
</template>
