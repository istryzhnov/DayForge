import {
  contrastRatio,
  darken,
  fromHsl,
  lighten,
  mix,
  rotateHue,
  saturate,
  toHsl,
} from './color'
import {
  THEME_COLOR_KEY,
  type ResolvedPalette,
  type ThemeColorKey,
  type ThemeMode,
} from './tokens'

/** Message keys: the settings namespace translates them where they show. */
export interface ColorSuggestion {
  color: string
  labelKey: string
  hintKey: string
}

/** Nudges lightness until a colour has a fighting chance on the surface. */
function fitToSurface(color: string, isDark: boolean): string {
  const { l } = toHsl(color)
  if (isDark && l < 42) return lighten(color, 42 - l)
  if (!isDark && l > 62) return darken(color, l - 62)
  return color
}

/** Keeps a hue but borrows another colour's saturation and lightness. */
function matchEnergy(hueSource: string, energySource: string): string {
  const hue = toHsl(hueSource)
  const energy = toHsl(energySource)
  return fromHsl({ h: hue.h, s: energy.s, l: energy.l })
}

export function suggestionsFor(
  key: ThemeColorKey,
  palette: ResolvedPalette,
  mode: ThemeMode,
): ColorSuggestion[] {
  const isDark = mode === 'dark'
  const accent = palette.accent
  const fit = (color: string) => fitToSurface(color, isDark)

  switch (key) {
    case THEME_COLOR_KEY.ACCENT:
      return [
        {
          color: fit(accent),
          labelKey: 'settings.suggestTuned',
          hintKey: 'settings.suggestHintAccentTuned',
        },
        {
          color: fit(rotateHue(accent, 30)),
          labelKey: 'settings.suggestWarmer',
          hintKey: 'settings.suggestHintAccentWarmer',
        },
        {
          color: fit(rotateHue(accent, -30)),
          labelKey: 'settings.suggestCooler',
          hintKey: 'settings.suggestHintAccentCooler',
        },
        {
          color: fit(saturate(accent, 22)),
          labelKey: 'settings.suggestVivid',
          hintKey: 'settings.suggestHintAccentVivid',
        },
        {
          color: fit(saturate(accent, -28)),
          labelKey: 'settings.suggestMuted',
          hintKey: 'settings.suggestHintAccentMuted',
        },
        {
          color: fit(mix(accent, palette.text, 0.7)),
          labelKey: 'settings.suggestBlended',
          hintKey: 'settings.suggestHintAccentBlended',
        },
      ]

    case THEME_COLOR_KEY.MAJOR:
      return [
        {
          color: fit(rotateHue(accent, 180)),
          labelKey: 'settings.suggestComplement',
          hintKey: 'settings.suggestHintMajorComplement',
        },
        {
          color: fit(rotateHue(accent, 150)),
          labelKey: 'settings.suggestSplit',
          hintKey: 'settings.suggestHintMajorSplit',
        },
        {
          color: fit(rotateHue(accent, 120)),
          labelKey: 'settings.suggestTriad',
          hintKey: 'settings.suggestHintMajorTriad',
        },
        {
          color: fit(mix(accent, '#ff7a2f', 0.35)),
          labelKey: 'settings.suggestAmber',
          hintKey: 'settings.suggestHintMajorAmber',
        },
        {
          color: fit(lighten(accent, isDark ? 16 : -16)),
          labelKey: 'settings.suggestSameFamily',
          hintKey: 'settings.suggestHintMajorSameFamily',
        },
      ]

    case THEME_COLOR_KEY.MINOR:
      return [
        {
          color: fit(accent),
          labelKey: 'settings.suggestMatchAccent',
          hintKey: 'settings.suggestHintMinorMatchAccent',
        },
        {
          color: fit(rotateHue(accent, 30)),
          labelKey: 'settings.suggestAnalogous',
          hintKey: 'settings.suggestHintMinorAnalogous',
        },
        {
          color: fit(rotateHue(accent, -30)),
          labelKey: 'settings.suggestAnalogousCool',
          hintKey: 'settings.suggestHintMinorAnalogousCool',
        },
        {
          color: fit(saturate(accent, -34)),
          labelKey: 'settings.suggestSoft',
          hintKey: 'settings.suggestHintMinorSoft',
        },
        {
          color: isDark ? '#dddddd' : '#1d1d1d',
          labelKey: 'settings.suggestNeutral',
          hintKey: 'settings.suggestHintMinorNeutral',
        },
      ]

    case THEME_COLOR_KEY.BG:
      return [
        {
          color: isDark
            ? mix(accent, '#0b0d12', 0.07)
            : mix(accent, '#f7f9fc', 0.05),
          labelKey: 'settings.suggestAccentTint',
          hintKey: 'settings.suggestHintBgAccentTint',
        },
        {
          color: isDark ? '#0c111a' : '#eef3fb',
          labelKey: 'settings.suggestClassic',
          hintKey: 'settings.suggestHintBgClassic',
        },
        {
          color: isDark ? '#0a0a0b' : '#fbfbfa',
          labelKey: 'settings.suggestNeutral',
          hintKey: 'settings.suggestHintBgNeutral',
        },
        {
          color: isDark
            ? mix(accent, '#101014', 0.14)
            : mix(accent, '#ffffff', 0.1),
          labelKey: 'settings.suggestImmersive',
          hintKey: 'settings.suggestHintBgImmersive',
        },
      ]

    case THEME_COLOR_KEY.PANEL:
      return [
        {
          color: isDark ? lighten(palette.bg, 5) : lighten(palette.bg, 4),
          labelKey: 'settings.suggestLifted',
          hintKey: 'settings.suggestHintPanelLifted',
        },
        {
          color: isDark
            ? mix(accent, lighten(palette.bg, 5), 0.06)
            : mix(accent, '#ffffff', 0.04),
          labelKey: 'settings.suggestAccentTint',
          hintKey: 'settings.suggestHintPanelAccentTint',
        },
        {
          color: isDark ? '#151d29' : '#ffffff',
          labelKey: 'settings.suggestClassic',
          hintKey: 'settings.suggestHintPanelClassic',
        },
        {
          color: palette.bg,
          labelKey: 'settings.suggestFlat',
          hintKey: 'settings.suggestHintPanelFlat',
        },
      ]

    case THEME_COLOR_KEY.LINE: {
      const subtle = isDark
        ? lighten(palette.panel, 9)
        : darken(palette.panel, 10)
      return [
        {
          color: subtle,
          labelKey: 'settings.suggestSubtle',
          hintKey: 'settings.suggestHintLineSubtle',
        },
        {
          color: mix(accent, subtle, 0.3),
          labelKey: 'settings.suggestAccentFrame',
          hintKey: 'settings.suggestHintLineAccentFrame',
        },
        {
          color: isDark
            ? lighten(palette.panel, 20)
            : darken(palette.panel, 22),
          labelKey: 'settings.suggestDefined',
          hintKey: 'settings.suggestHintLineDefined',
        },
        {
          color: isDark ? lighten(palette.panel, 3) : darken(palette.panel, 4),
          labelKey: 'settings.suggestNearlyNone',
          hintKey: 'settings.suggestHintLineNearlyNone',
        },
      ]
    }

    case THEME_COLOR_KEY.TEXT:
      return [
        {
          color: isDark ? '#eef4ff' : '#162033',
          labelKey: 'settings.suggestClassic',
          hintKey: 'settings.suggestHintTextClassic',
        },
        {
          color: isDark
            ? mix(accent, '#ffffff', 0.1)
            : mix(accent, '#101828', 0.12),
          labelKey: 'settings.suggestAccentTint',
          hintKey: 'settings.suggestHintTextAccentTint',
        },
        {
          color: isDark ? '#ffffff' : '#000000',
          labelKey: 'settings.suggestMaximum',
          hintKey: 'settings.suggestHintTextMaximum',
        },
        {
          color: isDark ? '#cfd8e6' : '#33415c',
          labelKey: 'settings.suggestSofter',
          hintKey: 'settings.suggestHintTextSofter',
        },
      ]

    case THEME_COLOR_KEY.MUTED:
      return [
        {
          color: mix(palette.text, palette.panel, 0.62),
          labelKey: 'settings.suggestBalanced',
          hintKey: 'settings.suggestHintMutedBalanced',
        },
        {
          color: mix(palette.text, palette.panel, 0.45),
          labelKey: 'settings.suggestQuieter',
          hintKey: 'settings.suggestHintMutedQuieter',
        },
        {
          color: mix(accent, mix(palette.text, palette.panel, 0.6), 0.35),
          labelKey: 'settings.suggestAccentTint',
          hintKey: 'settings.suggestHintMutedAccentTint',
        },
      ]

    case THEME_COLOR_KEY.DANGER:
      return [
        {
          color: fit('#ef4444'),
          labelKey: 'settings.suggestClassicRed',
          hintKey: 'settings.suggestHintDangerClassicRed',
        },
        {
          color: fit(matchEnergy('#ef4444', accent)),
          labelKey: 'settings.suggestMatched',
          hintKey: 'settings.suggestHintDangerMatched',
        },
        {
          color: fit('#ff6b6b'),
          labelKey: 'settings.suggestSoftRed',
          hintKey: 'settings.suggestHintDangerSoftRed',
        },
        {
          color: fit('#ff2d55'),
          labelKey: 'settings.suggestHotRed',
          hintKey: 'settings.suggestHintDangerHotRed',
        },
      ]

    default:
      return []
  }
}

export function suggestedModeFor(color: string): {
  mode: ThemeMode
  reasonKey: string
} {
  const { s, l } = toHsl(color)

  if (l >= 68 && s >= 45) {
    return {
      mode: 'dark',
      reasonKey: 'settings.suggestModeDarkBright',
    }
  }

  if (l <= 35) {
    return {
      mode: 'light',
      reasonKey: 'settings.suggestModeLightDeep',
    }
  }

  if (s <= 12) {
    return {
      mode: 'dark',
      reasonKey: 'settings.suggestModeDarkNeutral',
    }
  }

  return l > 55
    ? {
        mode: 'dark',
        reasonKey: 'settings.suggestModeDarkLighter',
      }
    : {
        mode: 'light',
        reasonKey: 'settings.suggestModeLightDarker',
      }
}

export interface ContrastReport {
  ratio: number
  level: 'good' | 'ok' | 'poor'
  /** Message key; takes the {ratio} placeholder. */
  messageKey: string
}

/** Plain-language contrast feedback for a colour drawn on a surface. */
export function contrastReport(color: string, surface: string): ContrastReport {
  const ratio = Math.round(contrastRatio(color, surface) * 10) / 10

  if (ratio >= 4.5) {
    return {
      ratio,
      level: 'good',
      messageKey: 'settings.contrastGood',
    }
  }
  if (ratio >= 3) {
    return {
      ratio,
      level: 'ok',
      messageKey: 'settings.contrastOk',
    }
  }
  return {
    ratio,
    level: 'poor',
    messageKey: 'settings.contrastPoor',
  }
}
