<script setup lang="ts">
import { computed } from 'vue'
import type { Goal, GoalTheme } from '../../../entities/GoalEntity'
import { GOAL_COLOR_PRESETS } from '../../../entities/constants'
import {
  DEFAULT_GOAL_INTENSITY,
  buildGoalThemeVars,
  type ThemeSurfaces,
} from '../../../composables/theme/goalTheme'
import {
  THEME_COLOR_KEY,
  type ResolvedPalette,
  type ThemeMode,
} from '../../../composables/theme/tokens'
import { suggestionsFor } from '../../../composables/theme/suggestions'
import ColorField from './ColorField.vue'

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

const presets: string[] = [...GOAL_COLOR_PRESETS]

const theme = computed<GoalTheme>(() => props.goal.theme ?? {})
const hasTheme = computed(() => Boolean(theme.value.accent))

/**
 * The colours this project actually renders with — the explicit overrides plus
 * everything derived from its accent. Showing the derived values is the point:
 * they are what used to stay stubbornly default.
 */
const vars = computed(() =>
  buildGoalThemeVars(theme.value, props.surfaces, props.mode),
)

/** Suggestions are generated as if the project accent were the theme accent,
 *  so "complement" means complement of *this project's* colour. */
const projectPalette = computed<ResolvedPalette>(() => ({
  ...props.palette,
  accent: theme.value.accent ?? props.palette.accent,
  major: vars.value['--major'] ?? props.palette.major,
  minor: vars.value['--minor'] ?? props.palette.minor,
  line: vars.value['--line'] ?? props.palette.line,
  panel: vars.value['--panel'] ?? props.palette.panel,
}))

const intensity = computed(() => theme.value.intensity ?? DEFAULT_GOAL_INTENSITY)

const fields = computed(() => [
  {
    key: 'major' as const,
    label: 'Project circles',
    description: 'Rows that hold other tasks, and their calendar blocks.',
    value: vars.value['--major'] ?? props.palette.major,
    suggestionKey: THEME_COLOR_KEY.MAJOR,
  },
  {
    key: 'minor' as const,
    label: 'Task circles',
    description: 'Ordinary task circles inside this project.',
    value: vars.value['--minor'] ?? props.palette.minor,
    suggestionKey: THEME_COLOR_KEY.MINOR,
  },
  {
    key: 'line' as const,
    label: 'Borders',
    description: 'Frames and dividers inside the panel.',
    value: vars.value['--line'] ?? props.palette.line,
    suggestionKey: THEME_COLOR_KEY.LINE,
  },
  {
    key: 'surface' as const,
    label: 'Panels',
    description: 'Cards and raised surfaces inside the panel.',
    value: vars.value['--panel'] ?? props.palette.panel,
    suggestionKey: THEME_COLOR_KEY.PANEL,
  },
])

function pickAccent(color: string) {
  emit('update', { ...theme.value, accent: color })
}

function setField(key: keyof GoalTheme, color: string) {
  emit('update', { ...theme.value, [key]: color })
}

function clearField(key: keyof GoalTheme) {
  const next: GoalTheme = { ...theme.value }
  delete next[key]
  emit('update', next)
}

function setIntensity(event: Event) {
  const value = Number((event.target as HTMLInputElement).value) / 100
  emit('update', { ...theme.value, intensity: value })
}

function clearTheme() {
  emit('update', undefined)
}

function swatchStyle(color: string) {
  return { backgroundColor: color }
}

function previewStyle() {
  return vars.value
}

function suggestionsForField(key: (typeof THEME_COLOR_KEY)[keyof typeof THEME_COLOR_KEY]) {
  return suggestionsFor(key, projectPalette.value, props.mode)
}
</script>

<template>
  <div class="appearance-section">
    <p class="appearance-section__intro">
      Colours set here apply to
      <strong>{{ goal.title }}</strong> only — its panel, task circles, frames
      and habit ring. Everything else keeps the global theme.
    </p>

    <p class="sidebar-caption">Project colour</p>
    <div class="appearance-swatches">
      <button
        v-for="color in presets"
        :key="color"
        class="appearance-swatch"
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
      :value="vars['--accent'] ?? palette.accent"
      :is-custom="hasTheme"
      :suggestions="suggestionsForField(THEME_COLOR_KEY.ACCENT)"
      @update="pickAccent"
      @reset="clearTheme"
    />

    <template v-if="hasTheme">
      <div class="appearance-preview" :style="previewStyle()">
        <span class="appearance-preview__dot appearance-preview__dot--project"></span>
        <span class="appearance-preview__dot appearance-preview__dot--task"></span>
        <span class="appearance-preview__card">Frames and cards</span>
        <span class="appearance-preview__btn">Button</span>
      </div>

      <label class="appearance-slider">
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
          @input="setIntensity"
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
        :is-custom="theme[field.key] !== undefined"
        :suggestions="suggestionsForField(field.suggestionKey)"
        @update="(color) => setField(field.key, color)"
        @reset="() => clearField(field.key)"
      />

      <button class="btn btn-ghost appearance-reset" type="button" @click="clearTheme">
        Clear project colours
      </button>
    </template>
  </div>
</template>
