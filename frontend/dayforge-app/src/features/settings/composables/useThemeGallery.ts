import { computed } from 'vue'
import { i18n } from '../../../i18n'
import { useTheme } from '../../../composables/useTheme'
import {
  PALETTE_PRESETS,
  presetColorsFor,
  type PalettePreset,
  samePalette,
} from '../../../composables/theme/tokens'
import { suggestedModeFor } from '../../../composables/theme/suggestions'

export function useThemeGallery() {
  const theme = useTheme()

  const modeAdvice = computed(() => {
    const advice = suggestedModeFor(theme.effectivePalette.value.accent)
    return {
      mode: advice.mode,
      reason: i18n.global.t(advice.reasonKey),
      matches: advice.mode === theme.themeMode.value,
    }
  })

  /** The four dots on a preset card, in the mode now in force: accent, projects, tasks, canvas. */
  function presetDots(preset: PalettePreset): string[] {
    const colors = presetColorsFor(preset, theme.themeMode.value)
    if (Object.keys(colors).length === 0) {
      return theme.themeMode.value === 'dark'
        ? ['#73ff44', '#ff7a2f', '#23c7eb', '#0c111a']
        : ['#34b531', '#ff7a2f', '#1ea9cb', '#eef3fb']
    }
    return [
      colors.accent ?? '#888888',
      colors.major ?? '#888888',
      colors.minor ?? '#888888',
      colors.bg ?? '#888888',
    ]
  }

  function isPresetActive(preset: PalettePreset): boolean {
    return (
      preset.id === theme.presetId.value &&
      preset.style === theme.themeStyle.value &&
      samePalette(
        presetColorsFor(preset, theme.themeMode.value),
        theme.palette.value,
      )
    )
  }

  return {
    presets: PALETTE_PRESETS,
    themeMode: theme.themeMode,
    accent: computed(() => theme.effectivePalette.value.accent),
    modeAdvice,
    presetDots,
    isPresetActive,
    setThemeMode: theme.setThemeMode,
    applyPreset: theme.applyPreset,
    resetAll: theme.resetAll,
  }
}
