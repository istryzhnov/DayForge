<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Goal, GoalTheme } from '../../../entities/GoalEntity'
import type { ThemeSurfaces } from '../../../composables/theme/goalTheme'
import type {
  ResolvedPalette,
  ThemeMode,
} from '../../../composables/theme/tokens'
import ColorField from './ColorField.vue'
import { useProjectThemeEditor } from '../composables/useProjectThemeEditor'
import { rangeValue, swatchStyle } from '../../../composables/inputValue'

const props = defineProps<{
  goal: Goal
  mode: ThemeMode
  surfaces: ThemeSurfaces
  /** The global palette, used as the backdrop the project colour sits on. */
  palette: ResolvedPalette
}>()

const emit = defineEmits<{
  (e: 'update', theme: GoalTheme | undefined): void
}>()

const { t } = useI18n()

const {
  presets,
  theme,
  hasTheme,
  vars,
  intensity,
  accentValue,
  accentSuggestions,
  fields,
  pickAccent,
  setField,
  clearField,
  setIntensityPercent,
  clearTheme,
} = useProjectThemeEditor(props, {
  onUpdate: (next) => emit('update', next),
})
</script>

<template>
  <div class="settings-section">
    <i18n-t
      keypath="settings.projectThemeIntro"
      tag="p"
      class="settings-section__intro"
    >
      <template #project>
        <strong>{{ goal.title }}</strong>
      </template>
    </i18n-t>

    <p class="ui-section-label ui-section-label--wrap">
      {{ t('settings.projectColour') }}
    </p>
    <div class="settings-swatches">
      <button
        v-for="color in presets"
        :key="color"
        class="settings-swatch"
        :class="{ active: theme.accent === color }"
        type="button"
        :style="swatchStyle(color)"
        :aria-label="t('settings.projectSwatch', { color })"
        @click="pickAccent(color)"
      ></button>
    </div>

    <ColorField
      :label="t('settings.projectColourAccent')"
      :description="t('settings.projectColourAccentDescription')"
      :value="accentValue"
      :is-custom="hasTheme"
      :suggestions="accentSuggestions"
      @update="pickAccent"
      @reset="clearTheme"
    />

    <template v-if="hasTheme">
      <div class="settings-preview ui-card" :style="vars">
        <span
          class="settings-preview__dot settings-preview__dot--project"
        ></span>
        <span class="settings-preview__dot settings-preview__dot--task"></span>
        <span class="settings-preview__card">{{
          t('settings.projectPreviewFrames')
        }}</span>
        <span class="settings-preview__btn">{{
          t('settings.projectPreviewButton')
        }}</span>
      </div>

      <label class="settings-slider ui-card">
        <span>
          {{ t('settings.projectTintStrength') }}
          <em>{{ Math.round(intensity * 100) }}%</em>
        </span>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          :value="Math.round(intensity * 100)"
          @input="setIntensityPercent(rangeValue($event))"
        />
        <small>{{ t('settings.projectTintHint') }}</small>
      </label>

      <p class="ui-section-label ui-section-label--wrap">
        {{ t('settings.projectFineTuning') }}
      </p>
      <ColorField
        v-for="field in fields"
        :key="field.key"
        :label="field.label"
        :description="field.description"
        :value="field.value"
        :is-custom="field.isCustom"
        :suggestions="field.suggestions"
        @update="(color) => setField(field.key, color)"
        @reset="() => clearField(field.key)"
      />

      <button
        class="btn btn-ghost settings-reset"
        type="button"
        @click="clearTheme"
      >
        {{ t('settings.projectClearColours') }}
      </button>
    </template>
  </div>
</template>
