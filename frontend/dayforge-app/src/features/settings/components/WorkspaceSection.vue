<script setup lang="ts">
import { useTheme } from '../../../composables/useTheme'
import { useSettings } from '../../../composables/useSettings'
import {
  DENSITY_OPTIONS,
  FONT_OPTIONS,
  MOTION_OPTIONS,
  PATTERN_OPTIONS,
} from '../composables/settingsOptions'
import {
  checkedValue,
  fractionValue,
  rangeValue,
} from '../../../composables/inputValue'

const { workspace, setWorkspace, resetWorkspace } = useTheme()
const { settings, update, resetSection } = useSettings()

function resetEverything() {
  resetWorkspace()
  resetSection('accessibility')
}
</script>

<template>
  <div class="settings-section">
    <label class="settings-slider">
      <span>
        Corner roundness
        <em>{{ Math.round(workspace.radiusScale * 100) }}%</em>
      </span>
      <input
        type="range"
        min="0"
        max="200"
        step="10"
        :value="Math.round(workspace.radiusScale * 100)"
        @input="setWorkspace({ radiusScale: fractionValue($event) })"
      />
      <small>0% is square, 100% is the designed shape.</small>
    </label>

    <p class="sidebar-caption">Spacing</p>
    <div class="settings-chips">
      <button
        v-for="option in DENSITY_OPTIONS"
        :key="option.id"
        class="theme-chip"
        :class="{ active: workspace.density === option.id }"
        type="button"
        @click="setWorkspace({ density: option.id })"
      >
        {{ option.label }}
      </button>
    </div>

    <p class="sidebar-caption">Background</p>
    <div class="settings-chips">
      <button
        v-for="option in PATTERN_OPTIONS"
        :key="option.id"
        class="theme-chip"
        :class="{ active: workspace.pattern === option.id }"
        type="button"
        @click="setWorkspace({ pattern: option.id })"
      >
        {{ option.label }}
      </button>
    </div>

    <label class="settings-slider">
      <span>
        Glow strength
        <em>{{ Math.round(workspace.glow * 100) }}%</em>
      </span>
      <input
        type="range"
        min="0"
        max="250"
        step="10"
        :value="Math.round(workspace.glow * 100)"
        @input="setWorkspace({ glow: fractionValue($event) })"
      />
      <small>How strongly the accent lights the canvas behind panels.</small>
    </label>

    <label class="settings-slider">
      <span>
        Panel blur
        <em>{{ workspace.blur }}px</em>
      </span>
      <input
        type="range"
        min="0"
        max="24"
        step="1"
        :value="workspace.blur"
        @input="setWorkspace({ blur: rangeValue($event) })"
      />
      <small>Frosted glass behind translucent panels.</small>
    </label>

    <p class="sidebar-caption">Typeface</p>
    <div class="settings-chips">
      <button
        v-for="option in FONT_OPTIONS"
        :key="option.id"
        class="theme-chip"
        :class="{ active: workspace.font === option.id }"
        type="button"
        @click="setWorkspace({ font: option.id })"
      >
        {{ option.label }}
      </button>
    </div>

    <p class="sidebar-caption">Motion</p>
    <div class="settings-chips">
      <button
        v-for="option in MOTION_OPTIONS"
        :key="option.id"
        class="theme-chip"
        :class="{ active: workspace.motion === option.id }"
        type="button"
        @click="setWorkspace({ motion: option.id })"
      >
        {{ option.label }}
      </button>
    </div>

    <p class="sidebar-caption">Reading comfort</p>

    <label class="settings-slider">
      <span>
        Text size
        <em>{{ Math.round(settings.accessibility.textScale * 100) }}%</em>
      </span>
      <input
        type="range"
        min="80"
        max="160"
        step="5"
        :value="Math.round(settings.accessibility.textScale * 100)"
        @input="update('accessibility', { textScale: fractionValue($event) })"
      />
      <small>Scales every label in the app, layout included.</small>
    </label>

    <label class="settings-toggle">
      <input
        type="checkbox"
        :checked="settings.accessibility.largeTargets"
        @change="
          update('accessibility', { largeTargets: checkedValue($event) })
        "
      />
      <span>
        <strong>Larger touch targets</strong>
        <em>Roomier buttons, rows and circles — easier to hit on a phone.</em>
      </span>
    </label>

    <label class="settings-toggle">
      <input
        type="checkbox"
        :checked="settings.accessibility.highContrast"
        @change="
          update('accessibility', { highContrast: checkedValue($event) })
        "
      />
      <span>
        <strong>High contrast</strong>
        <em>Firmer borders and text, no translucent surfaces.</em>
      </span>
    </label>

    <button
      class="btn btn-ghost settings-reset"
      type="button"
      @click="resetEverything"
    >
      Reset workspace
    </button>
  </div>
</template>
