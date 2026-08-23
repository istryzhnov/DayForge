<script setup lang="ts">
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
    <p class="settings-section__intro">
      Colours set here apply to
      <strong>{{ goal.title }}</strong> only — its panel, task circles, frames
      and habit ring. Everything else keeps the global theme.
    </p>

    <p class="sidebar-caption">Project colour</p>
    <div class="settings-swatches">
      <button
        v-for="color in presets"
        :key="color"
        class="settings-swatch"
        :class="{ active: theme.accent === color }"
        type="button"
        :style="swatchStyle(color)"
        :aria-label="`Use ${color} for this project`"
        @click="pickAccent(color)"
      ></button>
    </div>

    <ColorField
      label="Accent"
      description="Buttons, the habit ring and active states in this project."
      :value="accentValue"
      :is-custom="hasTheme"
      :suggestions="accentSuggestions"
      @update="pickAccent"
      @reset="clearTheme"
    />

    <template v-if="hasTheme">
      <div class="settings-preview" :style="vars">
        <span
          class="settings-preview__dot settings-preview__dot--project"
        ></span>
        <span class="settings-preview__dot settings-preview__dot--task"></span>
        <span class="settings-preview__card">Frames and cards</span>
        <span class="settings-preview__btn">Button</span>
      </div>

      <label class="settings-slider">
        <span>
          Tint strength
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
        <small>How far the colour bleeds into panels and borders.</small>
      </label>

      <p class="sidebar-caption">Fine tuning</p>
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
        Clear project colours
      </button>
    </template>
  </div>
</template>
