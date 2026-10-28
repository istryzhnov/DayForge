<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useThemeGallery } from '../composables/useThemeGallery'
import { swatchStyle } from '../../../composables/inputValue'

const { t } = useI18n()

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
    <p class="sidebar-caption">{{ t('settings.themeStyle') }}</p>
    <div class="theme-panel__group">
      <button
        class="theme-chip"
        :class="{ active: themeStyle === 'vivid' }"
        type="button"
        @click="setThemeStyle('vivid')"
      >
        {{ t('settings.themeStyleFresh') }}
      </button>
      <button
        class="theme-chip"
        :class="{ active: themeStyle === 'minimal' }"
        type="button"
        @click="setThemeStyle('minimal')"
      >
        {{ t('settings.themeStyleMinimal') }}
      </button>
    </div>

    <p class="sidebar-caption">{{ t('settings.themeMode') }}</p>
    <div class="theme-panel__group">
      <button
        class="theme-chip"
        :class="{ active: themeMode === 'light' }"
        type="button"
        @click="setThemeMode('light')"
      >
        {{ t('settings.themeModeDay') }}
      </button>
      <button
        class="theme-chip"
        :class="{ active: themeMode === 'dark' }"
        type="button"
        @click="setThemeMode('dark')"
      >
        {{ t('settings.themeModeNight') }}
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
          {{
            modeAdvice.mode === 'dark'
              ? t('settings.themeSwitchToNight')
              : t('settings.themeSwitchToDay')
          }}
        </button>
      </span>
    </p>

    <p class="sidebar-caption">{{ t('settings.themePalettes') }}</p>
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
        <strong>{{ t(preset.nameKey) }}</strong>
        <em>{{ t(preset.hintKey) }}</em>
      </button>
    </div>

    <button
      class="btn btn-ghost settings-reset"
      type="button"
      @click="resetAll"
    >
      {{ t('settings.themeReset') }}
    </button>
  </div>
</template>
