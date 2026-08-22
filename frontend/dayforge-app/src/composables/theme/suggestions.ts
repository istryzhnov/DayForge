/**
 * "Which colour goes with this one?"
 *
 * Picking nine colours from scratch is a design job, not a settings job, so
 * every field in the appearance panel can offer companions derived from the
 * rest of the palette: a complement for the colour that must stand apart, an
 * analogous hue for the one that should belong, a surface tinted by the accent.
 * The suggestions change when the surface does, which is the point — a green
 * that sings on charcoal is unreadable on paper.
 */

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

export interface ColorSuggestion {
  color: string
  label: string
  hint: string
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
          label: 'Tuned',
          hint: 'Same hue, lightness adjusted to read on your panels.',
        },
        {
          color: fit(rotateHue(accent, 30)),
          label: 'Warmer',
          hint: 'One step around the wheel towards red.',
        },
        {
          color: fit(rotateHue(accent, -30)),
          label: 'Cooler',
          hint: 'One step towards blue — calmer over a long session.',
        },
        {
          color: fit(saturate(accent, 22)),
          label: 'Vivid',
          hint: 'More saturation: the accent speaks up.',
        },
        {
          color: fit(saturate(accent, -28)),
          label: 'Muted',
          hint: 'Desaturated, for a quieter workspace.',
        },
        {
          color: fit(mix(accent, palette.text, 0.7)),
          label: 'Blended',
          hint: 'Pulled towards your text colour so it sits inside the theme.',
        },
      ]

    case THEME_COLOR_KEY.MAJOR:
      return [
        {
          color: fit(rotateHue(accent, 180)),
          label: 'Complement',
          hint: 'Opposite the accent — projects read apart from tasks.',
        },
        {
          color: fit(rotateHue(accent, 150)),
          label: 'Split',
          hint: 'Near-opposite: contrast without the clash.',
        },
        {
          color: fit(rotateHue(accent, 120)),
          label: 'Triad',
          hint: 'A third of the wheel away — balanced and distinct.',
        },
        {
          color: fit(mix(accent, '#ff7a2f', 0.35)),
          label: 'Amber',
          hint: 'The classic project orange, tinted by your accent.',
        },
        {
          color: fit(lighten(accent, isDark ? 16 : -16)),
          label: 'Same family',
          hint: 'A brighter accent, for a single-hue palette.',
        },
      ]

    case THEME_COLOR_KEY.MINOR:
      return [
        {
          color: fit(accent),
          label: 'Match accent',
          hint: 'Tasks share the accent — the most cohesive option.',
        },
        {
          color: fit(rotateHue(accent, 30)),
          label: 'Analogous',
          hint: 'A neighbouring hue: related, still separable.',
        },
        {
          color: fit(rotateHue(accent, -30)),
          label: 'Analogous cool',
          hint: 'The other neighbour, a shade calmer.',
        },
        {
          color: fit(saturate(accent, -34)),
          label: 'Soft',
          hint: 'Low saturation, so projects keep the loud colour.',
        },
        {
          color: isDark ? '#dddddd' : '#1d1d1d',
          label: 'Neutral',
          hint: 'No hue at all — the Minimal theme look.',
        },
      ]

    case THEME_COLOR_KEY.BG:
      return [
        {
          color: isDark
            ? mix(accent, '#0b0d12', 0.07)
            : mix(accent, '#f7f9fc', 0.05),
          label: 'Accent tint',
          hint: 'Barely tinted with your accent — surfaces feel related.',
        },
        {
          color: isDark ? '#0c111a' : '#eef3fb',
          label: 'Classic',
          hint: 'The built-in DayForge canvas.',
        },
        {
          color: isDark ? '#0a0a0b' : '#fbfbfa',
          label: 'Neutral',
          hint: 'Pure greyscale: lets the accent do all the talking.',
        },
        {
          color: isDark
            ? mix(accent, '#101014', 0.14)
            : mix(accent, '#ffffff', 0.1),
          label: 'Immersive',
          hint: 'A stronger wash of the accent across the canvas.',
        },
      ]

    case THEME_COLOR_KEY.PANEL:
      return [
        {
          color: isDark ? lighten(palette.bg, 5) : lighten(palette.bg, 4),
          label: 'Lifted',
          hint: 'One step off the background — the usual card look.',
        },
        {
          color: isDark
            ? mix(accent, lighten(palette.bg, 5), 0.06)
            : mix(accent, '#ffffff', 0.04),
          label: 'Accent tint',
          hint: 'Cards pick up a hint of the accent.',
        },
        {
          color: isDark ? '#151d29' : '#ffffff',
          label: 'Classic',
          hint: 'The built-in panel colour.',
        },
        {
          color: palette.bg,
          label: 'Flat',
          hint: 'Same as the background — panels read through borders only.',
        },
      ]

    case THEME_COLOR_KEY.LINE: {
      const subtle = isDark
        ? lighten(palette.panel, 9)
        : darken(palette.panel, 10)
      return [
        {
          color: subtle,
          label: 'Subtle',
          hint: 'Just visible against your panels.',
        },
        {
          color: mix(accent, subtle, 0.3),
          label: 'Accent frame',
          hint: 'Borders tinted with the accent — frames join the theme.',
        },
        {
          color: isDark
            ? lighten(palette.panel, 20)
            : darken(palette.panel, 22),
          label: 'Defined',
          hint: 'Stronger outlines for a more structured layout.',
        },
        {
          color: isDark ? lighten(palette.panel, 3) : darken(palette.panel, 4),
          label: 'Nearly none',
          hint: 'Almost invisible frames — very quiet.',
        },
      ]
    }

    case THEME_COLOR_KEY.TEXT:
      return [
        {
          color: isDark ? '#eef4ff' : '#162033',
          label: 'Classic',
          hint: 'Maximum readability against the default panels.',
        },
        {
          color: isDark
            ? mix(accent, '#ffffff', 0.1)
            : mix(accent, '#101828', 0.12),
          label: 'Accent tint',
          hint: 'A whisper of the accent in every line of text.',
        },
        {
          color: isDark ? '#ffffff' : '#000000',
          label: 'Maximum',
          hint: 'The highest contrast available.',
        },
        {
          color: isDark ? '#cfd8e6' : '#33415c',
          label: 'Softer',
          hint: 'Slightly dimmed — easier at night.',
        },
      ]

    case THEME_COLOR_KEY.MUTED:
      return [
        {
          color: mix(palette.text, palette.panel, 0.62),
          label: 'Balanced',
          hint: 'Between your text and panel — reliably legible.',
        },
        {
          color: mix(palette.text, palette.panel, 0.45),
          label: 'Quieter',
          hint: 'Recedes further into the surface.',
        },
        {
          color: mix(accent, mix(palette.text, palette.panel, 0.6), 0.35),
          label: 'Accent tint',
          hint: 'Captions carry a trace of the accent.',
        },
      ]

    case THEME_COLOR_KEY.DANGER:
      return [
        {
          color: fit('#ef4444'),
          label: 'Classic red',
          hint: 'The universal delete colour.',
        },
        {
          color: fit(matchEnergy('#ef4444', accent)),
          label: 'Matched',
          hint: 'Red at the same saturation and lightness as your accent.',
        },
        {
          color: fit('#ff6b6b'),
          label: 'Soft red',
          hint: 'Less alarming, still unmistakable.',
        },
        {
          color: fit('#ff2d55'),
          label: 'Hot red',
          hint: 'For palettes that already lean magenta.',
        },
      ]

    default:
      return []
  }
}

/**
 * Which mode a colour lives happiest in — used to nudge the user when they pick
 * a neon for a white canvas, or a deep navy for a dark one.
 */
export function suggestedModeFor(color: string): {
  mode: ThemeMode
  reason: string
} {
  const { s, l } = toHsl(color)

  if (l >= 68 && s >= 45) {
    return {
      mode: 'dark',
      reason:
        'Bright, saturated colours glow on a dark canvas and glare on a light one.',
    }
  }

  if (l <= 35) {
    return {
      mode: 'light',
      reason: 'Deep colours keep their detail against a light background.',
    }
  }

  if (s <= 12) {
    return {
      mode: 'dark',
      reason: 'Near-neutral colours look deliberate in a dark, minimal workspace.',
    }
  }

  return l > 55
    ? {
        mode: 'dark',
        reason: 'A little lighter than mid-tone — it separates best from a dark surface.',
      }
    : {
        mode: 'light',
        reason: 'A little darker than mid-tone — it separates best from a light surface.',
      }
}

export interface ContrastReport {
  ratio: number
  level: 'good' | 'ok' | 'poor'
  message: string
}

/** Plain-language contrast feedback for a colour drawn on a surface. */
export function contrastReport(
  color: string,
  surface: string,
): ContrastReport {
  const ratio = Math.round(contrastRatio(color, surface) * 10) / 10

  if (ratio >= 4.5) {
    return { ratio, level: 'good', message: `Contrast ${ratio}:1 — comfortable.` }
  }
  if (ratio >= 3) {
    return {
      ratio,
      level: 'ok',
      message: `Contrast ${ratio}:1 — fine for large shapes, tight for small text.`,
    }
  }
  return {
    ratio,
    level: 'poor',
    message: `Contrast ${ratio}:1 — hard to see on this surface.`,
  }
}
