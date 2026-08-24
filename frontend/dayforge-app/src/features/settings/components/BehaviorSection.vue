<script setup lang="ts">
import { useSettings } from '../../../composables/useSettings'
import {
  PRIORITY_OPTIONS,
  START_VIEW_OPTIONS,
} from '../composables/settingsOptions'
import { checkedValue, rangeValue } from '../../../composables/inputValue'

const { settings, update, resetSection } = useSettings()
</script>

<template>
  <div class="settings-section">
    <p class="sidebar-caption">Open on start</p>
    <div class="settings-chips">
      <button
        v-for="option in START_VIEW_OPTIONS"
        :key="option.id"
        class="theme-chip"
        :class="{ active: settings.behavior.startView === option.id }"
        type="button"
        @click="update('behavior', { startView: option.id })"
      >
        {{ option.label }}
      </button>
    </div>

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
        :checked="settings.behavior.autoSelectFirstGoal"
        @change="
          update('behavior', { autoSelectFirstGoal: checkedValue($event) })
        "
      />
      <span>
        <strong>Open the first project on load</strong>
        <em>Off starts on "All Projects", with nothing filtered out.</em>
      </span>
    </label>

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
