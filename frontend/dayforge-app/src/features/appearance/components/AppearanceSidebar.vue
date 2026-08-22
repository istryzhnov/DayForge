<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import type { Goal, GoalTheme } from '../../../entities/GoalEntity'
import type { ID } from '../../../entities/types'
import { useTheme } from '../../../composables/useTheme'
import {
  BACKGROUND_PATTERN,
  COLOR_TOKENS,
  DENSITY,
  FONT_LABELS,
  FONT_OPTION,
  MOTION,
  PALETTE_PRESETS,
  THEME_COLOR_KEY,
  type BackgroundPattern,
  type ColorTokenMeta,
  type Density,
  type FontOption,
  type Motion,
  type PalettePreset,
  type ThemeColorKey,
} from '../../../composables/theme/tokens'
import {
  contrastReport,
  suggestedModeFor,
  suggestionsFor,
} from '../../../composables/theme/suggestions'
import ColorField from './ColorField.vue'
import ProjectThemeEditor from './ProjectThemeEditor.vue'
import {
  APPEARANCE_SECTION,
  useAppearancePanel,
  type AppearanceSection,
} from '../composables/useAppearancePanel'

const props = defineProps<{
  activeGoal: Goal | null
}>()

const emit = defineEmits<{
  (e: 'change-goal-theme', goalId: ID, theme: GoalTheme | undefined): void
}>()

const { activeSection, close } = useAppearancePanel()

const {
  themeStyle,
  themeMode,
  palette,
  workspace,
  effectivePalette,
  surfaces,
  setThemeStyle,
  setThemeMode,
  setColor,
  resetColor,
  resetPalette,
  applyPreset,
  setWorkspace,
  resetWorkspace,
  resetAll,
} = useTheme()

const sections: { id: AppearanceSection; label: string }[] = [
  { id: APPEARANCE_SECTION.PRESETS, label: 'Themes' },
  { id: APPEARANCE_SECTION.COLORS, label: 'Colours' },
  { id: APPEARANCE_SECTION.WORKSPACE, label: 'Workspace' },
  { id: APPEARANCE_SECTION.PROJECT, label: 'Project' },
]

const groups: { id: ColorTokenMeta['group']; label: string; hint: string }[] = [
  {
    id: 'primary',
    label: 'Main colours',
    hint: 'What tasks, projects and actions are painted with.',
  },
  {
    id: 'surface',
    label: 'Surfaces',
    hint: 'The canvas, the cards on it and the frames around them.',
  },
  {
    id: 'secondary',
    label: 'Text and alerts',
    hint: 'Everything that has to stay readable on those surfaces.',
  },
]

function tokensInGroup(group: ColorTokenMeta['group']) {
  return COLOR_TOKENS.filter((token) => token.group === group)
}

/** Which surface each colour has to hold its own against. */
function surfaceFor(key: ThemeColorKey): string | null {
  if (key === THEME_COLOR_KEY.BG) return null
  if (key === THEME_COLOR_KEY.PANEL) return effectivePalette.value.bg
  return effectivePalette.value.panel
}

function reportFor(key: ThemeColorKey) {
  const surface = surfaceFor(key)
  if (!surface) return null
  return contrastReport(effectivePalette.value[key], surface)
}

function suggestionsFrom(key: ThemeColorKey) {
  return suggestionsFor(key, effectivePalette.value, themeMode.value)
}

/** The nudge under the mode switch: does the accent belong on day or night? */
const modeAdvice = computed(() => {
  const advice = suggestedModeFor(effectivePalette.value.accent)
  return {
    ...advice,
    matches: advice.mode === themeMode.value,
  }
})

const presetDots = (preset: PalettePreset): string[] => {
  if (Object.keys(preset.colors).length === 0) {
    return preset.mode === 'dark'
      ? ['#73ff44', '#ff7a2f', '#23c7eb', '#0c111a']
      : ['#34b531', '#ff7a2f', '#1ea9cb', '#eef3fb']
  }
  return [
    preset.colors.accent ?? '#888888',
    preset.colors.major ?? '#888888',
    preset.colors.minor ?? '#888888',
    preset.colors.bg ?? '#888888',
  ]
}

const isPresetActive = (preset: PalettePreset) =>
  preset.style === themeStyle.value &&
  preset.mode === themeMode.value &&
  JSON.stringify(preset.colors) === JSON.stringify(palette.value)

const densities: { id: Density; label: string }[] = [
  { id: DENSITY.COMPACT, label: 'Compact' },
  { id: DENSITY.COZY, label: 'Cozy' },
  { id: DENSITY.ROOMY, label: 'Roomy' },
]

const patterns: { id: BackgroundPattern; label: string }[] = [
  { id: BACKGROUND_PATTERN.GLOW, label: 'Glow' },
  { id: BACKGROUND_PATTERN.GRID, label: 'Grid' },
  { id: BACKGROUND_PATTERN.DOTS, label: 'Dots' },
  { id: BACKGROUND_PATTERN.NONE, label: 'Plain' },
]

const fonts = Object.values(FONT_OPTION) as FontOption[]

const motions: { id: Motion; label: string }[] = [
  { id: MOTION.FULL, label: 'Full' },
  { id: MOTION.REDUCED, label: 'Reduced' },
]

function onRadius(event: Event) {
  setWorkspace({
    radiusScale: Number((event.target as HTMLInputElement).value) / 100,
  })
}

function onGlow(event: Event) {
  setWorkspace({ glow: Number((event.target as HTMLInputElement).value) / 100 })
}

function onBlur(event: Event) {
  setWorkspace({ blur: Number((event.target as HTMLInputElement).value) })
}

function swatchStyle(color: string) {
  return { backgroundColor: color }
}

function handleGoalTheme(theme: GoalTheme | undefined) {
  if (!props.activeGoal) return
  emit('change-goal-theme', props.activeGoal.id, theme)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <section class="appearance-panel" aria-label="Appearance settings">
    <header class="appearance-panel__head">
      <div>
        <strong>Appearance</strong>
        <p>Paint the workspace the way you want to look at it.</p>
      </div>
      <button
        class="appearance-panel__close"
        type="button"
        aria-label="Close appearance settings"
        @click="close"
      >
        ✕
      </button>
    </header>

    <nav class="appearance-tabs">
      <button
        v-for="section in sections"
        :key="section.id"
        class="theme-chip"
        :class="{ active: activeSection === section.id }"
        type="button"
        :disabled="section.id === 'project' && !activeGoal"
        @click="activeSection = section.id"
      >
        {{ section.label }}
      </button>
    </nav>

    <div class="appearance-panel__body">
      <!-- Ready-made looks ------------------------------------------------ -->
      <div v-if="activeSection === 'presets'" class="appearance-section">
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

        <p class="appearance-advice" :class="{ 'is-match': modeAdvice.matches }">
          <span
            class="appearance-advice__dot"
            :style="swatchStyle(effectivePalette.accent)"
          ></span>
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
        <div class="appearance-presets">
          <button
            v-for="preset in PALETTE_PRESETS"
            :key="preset.id"
            class="appearance-preset"
            :class="{ active: isPresetActive(preset) }"
            type="button"
            @click="applyPreset(preset)"
          >
            <span class="appearance-preset__dots">
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

        <button class="btn btn-ghost appearance-reset" type="button" @click="resetAll">
          Reset everything
        </button>
      </div>

      <!-- Every individual colour ----------------------------------------- -->
      <div v-else-if="activeSection === 'colors'" class="appearance-section">
        <p class="appearance-section__intro">
          Pick any colour by hand. Each field can also suggest companions built
          from the rest of your palette — a complement for the colours that
          should stand apart, a neighbouring hue for the ones that should
          belong.
        </p>

        <template v-for="group in groups" :key="group.id">
          <p class="sidebar-caption">{{ group.label }}</p>
          <p class="appearance-group-hint">{{ group.hint }}</p>
          <ColorField
            v-for="token in tokensInGroup(group.id)"
            :key="token.key"
            :label="token.label"
            :description="token.description"
            :value="effectivePalette[token.key]"
            :is-custom="palette[token.key] !== undefined"
            :suggestions="suggestionsFrom(token.key)"
            :contrast-message="reportFor(token.key)?.message"
            :contrast-level="reportFor(token.key)?.level"
            @update="(color) => setColor(token.key, color)"
            @reset="() => resetColor(token.key)"
          />
        </template>

        <button
          class="btn btn-ghost appearance-reset"
          type="button"
          @click="resetPalette"
        >
          Back to theme colours
        </button>
      </div>

      <!-- Shape, spacing, type -------------------------------------------- -->
      <div v-else-if="activeSection === 'workspace'" class="appearance-section">
        <label class="appearance-slider">
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
            @input="onRadius"
          />
          <small>0% is square, 100% is the designed shape.</small>
        </label>

        <p class="sidebar-caption">Spacing</p>
        <div class="appearance-chips">
          <button
            v-for="option in densities"
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
        <div class="appearance-chips">
          <button
            v-for="option in patterns"
            :key="option.id"
            class="theme-chip"
            :class="{ active: workspace.pattern === option.id }"
            type="button"
            @click="setWorkspace({ pattern: option.id })"
          >
            {{ option.label }}
          </button>
        </div>

        <label class="appearance-slider">
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
            @input="onGlow"
          />
          <small>How strongly the accent lights the canvas behind panels.</small>
        </label>

        <label class="appearance-slider">
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
            @input="onBlur"
          />
          <small>Frosted glass behind translucent panels.</small>
        </label>

        <p class="sidebar-caption">Typeface</p>
        <div class="appearance-chips">
          <button
            v-for="font in fonts"
            :key="font"
            class="theme-chip"
            :class="{ active: workspace.font === font }"
            type="button"
            @click="setWorkspace({ font })"
          >
            {{ FONT_LABELS[font] }}
          </button>
        </div>

        <p class="sidebar-caption">Motion</p>
        <div class="appearance-chips">
          <button
            v-for="option in motions"
            :key="option.id"
            class="theme-chip"
            :class="{ active: workspace.motion === option.id }"
            type="button"
            @click="setWorkspace({ motion: option.id })"
          >
            {{ option.label }}
          </button>
        </div>

        <button
          class="btn btn-ghost appearance-reset"
          type="button"
          @click="resetWorkspace"
        >
          Reset workspace
        </button>
      </div>

      <!-- One project's own palette ---------------------------------------- -->
      <ProjectThemeEditor
        v-else-if="activeGoal"
        :goal="activeGoal"
        :mode="themeMode"
        :surfaces="surfaces"
        :palette="effectivePalette"
        @update="handleGoalTheme"
      />

      <p v-else class="appearance-section__intro">
        Select a project in the left sidebar to give it its own colours.
      </p>
    </div>
  </section>
</template>
