<script setup lang="ts">
import { useThemeGallery } from '../composables/useThemeGallery'
import { swatchStyle } from '../../../composables/inputValue'

const {
  presets,
  themeStyle,
  themeMode,
  accent,
  modeAdvice,
  presetDots,
  isPresetActive,
  setThemeStyle,
  setThemeMode,
  applyPreset,
  resetAll,
} = useThemeGallery()
</script>

<template>
  <div class="settings-section">
    <p class="sidebar-caption">Style</p>
    <div class="theme-panel__group">
      <button
        class="theme-chip"
        :class="{ active: themeStyle === 'vivid' }"
        type="button"
        @click="setThemeStyle('vivid')"
      >
        Fresh
      </button>
      <button
        class="theme-chip"
        :class="{ active: themeStyle === 'minimal' }"
        type="button"
        @click="setThemeStyle('minimal')"
      >
        Minimal
      </button>
    </div>

    <p class="sidebar-caption">Mode</p>
    <div class="theme-panel__group">
      <button
        class="theme-chip"
        :class="{ active: themeMode === 'light' }"
        type="button"
        @click="setThemeMode('light')"
      >
        Day
      </button>
      <button
        class="theme-chip"
        :class="{ active: themeMode === 'dark' }"
        type="button"
        @click="setThemeMode('dark')"
      >
        Night
      </button>
    </div>

    <p class="settings-advice" :class="{ 'is-match': modeAdvice.matches }">
      <span class="settings-advice__dot" :style="swatchStyle(accent)"></span>
      <span>
        {{ modeAdvice.reason }}
        <button
          v-if="!modeAdvice.matches"
          class="color-field__link"
          type="button"
          @click="setThemeMode(modeAdvice.mode)"
        >
          Switch to {{ modeAdvice.mode === 'dark' ? 'night' : 'day' }}
        </button>
      </span>
    </p>

    <p class="sidebar-caption">Palettes</p>
    <div class="settings-presets">
      <button
        v-for="preset in presets"
        :key="preset.id"
        class="settings-preset"
        :class="{ active: isPresetActive(preset) }"
        type="button"
        @click="applyPreset(preset)"
      >
        <span class="settings-preset__dots">
          <span
            v-for="dot in presetDots(preset)"
            :key="dot"
            :style="swatchStyle(dot)"
          ></span>
        </span>
        <strong>{{ preset.name }}</strong>
        <em>{{ preset.hint }}</em>
      </button>
    </div>

    <button
      class="btn btn-ghost settings-reset"
      type="button"
      @click="resetAll"
    >
      Reset appearance
    </button>
  </div>
</template>
