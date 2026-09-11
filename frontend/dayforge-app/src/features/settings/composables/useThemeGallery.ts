import { computed } from 'vue'
import { useTheme } from '../../../composables/useTheme'
import {
  PALETTE_PRESETS,
  type PalettePreset,
} from '../../../composables/theme/tokens'
import { suggestedModeFor } from '../../../composables/theme/suggestions'

export function useThemeGallery() {
  const theme = useTheme()

  const modeAdvice = computed(() => {
    const advice = suggestedModeFor(theme.effectivePalette.value.accent)
    return { ...advice, matches: advice.mode === theme.themeMode.value }
  })

  /** The four dots on a preset card: accent, projects, tasks, canvas. */
  function presetDots(preset: PalettePreset): string[] {
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

  function isPresetActive(preset: PalettePreset): boolean {
    return (
      preset.style === theme.themeStyle.value &&
      preset.mode === theme.themeMode.value &&
      JSON.stringify(preset.colors) === JSON.stringify(theme.palette.value)
    )
  }

  return {
    presets: PALETTE_PRESETS,
    themeStyle: theme.themeStyle,
    themeMode: theme.themeMode,
    accent: computed(() => theme.effectivePalette.value.accent),
    modeAdvice,
    presetDots,
    isPresetActive,
    setThemeStyle: theme.setThemeStyle,
    setThemeMode: theme.setThemeMode,
    applyPreset: theme.applyPreset,
    resetAll: theme.resetAll,
  }
}
