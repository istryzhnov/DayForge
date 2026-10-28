<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import DisclosureSection from '../../../components/DisclosureSection.vue'
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

const { t } = useI18n()

const { workspace, setWorkspace, resetWorkspace } = useTheme()
const { settings, update, resetSection } = useSettings()

function resetEverything() {
  resetWorkspace()
  resetSection('accessibility')
}
</script>

<template>
  <div class="settings-section">
    <p class="sidebar-caption">{{ t('settings.workspaceSpacing') }}</p>
    <div class="settings-chips">
      <button
        v-for="option in DENSITY_OPTIONS"
        :key="option.id"
        class="theme-chip"
        :class="{ active: workspace.density === option.id }"
        type="button"
        @click="setWorkspace({ density: option.id })"
      >
        {{ t(option.labelKey) }}
      </button>
    </div>

    <p class="sidebar-caption">{{ t('settings.workspaceTypeface') }}</p>
    <div class="settings-chips">
      <button
        v-for="option in FONT_OPTIONS"
        :key="option.id"
        class="theme-chip"
        :class="{ active: workspace.font === option.id }"
        type="button"
        @click="setWorkspace({ font: option.id })"
      >
        {{ t(option.labelKey) }}
      </button>
    </div>

    <p class="sidebar-caption">{{ t('settings.workspaceReadingComfort') }}</p>

    <label class="settings-slider">
      <span>
        {{ t('settings.workspaceTextSize') }}
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
      <small>{{ t('settings.workspaceTextSizeHint') }}</small>
    </label>

    <DisclosureSection :label="t('settings.advanced')">
      <label class="settings-slider">
        <span>
          {{ t('settings.workspaceCornerRoundness') }}
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
        <small>{{ t('settings.workspaceCornerHint') }}</small>
      </label>

      <p class="sidebar-caption">{{ t('settings.workspaceBackground') }}</p>
      <div class="settings-chips">
        <button
          v-for="option in PATTERN_OPTIONS"
          :key="option.id"
          class="theme-chip"
          :class="{ active: workspace.pattern === option.id }"
          type="button"
          @click="setWorkspace({ pattern: option.id })"
        >
          {{ t(option.labelKey) }}
        </button>
      </div>

      <label class="settings-slider">
        <span>
          {{ t('settings.workspaceGlowStrength') }}
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
        <small>{{ t('settings.workspaceGlowHint') }}</small>
      </label>

      <label class="settings-slider">
        <span>
          {{ t('settings.workspacePanelBlur') }}
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
        <small>{{ t('settings.workspacePanelBlurHint') }}</small>
      </label>

      <p class="sidebar-caption">{{ t('settings.workspaceMotion') }}</p>
      <div class="settings-chips">
        <button
          v-for="option in MOTION_OPTIONS"
          :key="option.id"
          class="theme-chip"
          :class="{ active: workspace.motion === option.id }"
          type="button"
          @click="setWorkspace({ motion: option.id })"
        >
          {{ t(option.labelKey) }}
        </button>
      </div>

      <label class="settings-toggle">
        <input
          type="checkbox"
          :checked="settings.accessibility.largeTargets"
          @change="
            update('accessibility', { largeTargets: checkedValue($event) })
          "
        />
        <span>
          <strong>{{ t('settings.workspaceLargerTargets') }}</strong>
          <em>{{ t('settings.workspaceLargerTargetsHint') }}</em>
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
          <strong>{{ t('settings.workspaceHighContrast') }}</strong>
          <em>{{ t('settings.workspaceHighContrastHint') }}</em>
        </span>
      </label>
    </DisclosureSection>

    <button
      class="btn btn-ghost settings-reset"
      type="button"
      @click="resetEverything"
    >
      {{ t('settings.workspaceReset') }}
    </button>
  </div>
</template>
