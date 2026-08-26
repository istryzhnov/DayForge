
import type { GoalTheme } from '../../entities/GoalEntity'
import {
  contrastRatio,
  lighten,
  mix,
  readableTextOn,
  rotateHue,
  toHsl,
  withAlpha,
} from './color'
import type { ThemeMode } from './tokens'

export interface ThemeSurfaces {
  panel: string
  panelSoft: string
  line: string
  lineSoft: string
  ringCore: string
  text: string
}

/** How far the project colour is allowed to bleed into panels and frames. */
export const DEFAULT_GOAL_INTENSITY = 0.5

function markColorFor(fills: string[]): string {
  const dark = '#0d0f14'
  const light = '#ffffff'
  const worst = (candidate: string) =>
    Math.min(...fills.map((fill) => contrastRatio(candidate, fill)))
  return worst(dark) >= worst(light) ? dark : light
}

/** Keeps a derived colour visible on the current canvas. */
function fitToMode(color: string, mode: ThemeMode): string {
  const { l } = toHsl(color)
  if (mode === 'dark' && l < 44) return lighten(color, 44 - l)
  if (mode === 'light' && l > 60) return lighten(color, 60 - l)
  return color
}

export function buildGoalThemeVars(
  theme: GoalTheme | undefined,
  surfaces: ThemeSurfaces,
  mode: ThemeMode,
): Record<string, string> {
  const accent = theme?.accent
  if (!accent) return {}

  const intensity = Math.min(
    Math.max(theme?.intensity ?? DEFAULT_GOAL_INTENSITY, 0),
    1,
  )
  const minor = theme?.minor ?? accent
  const major = theme?.major ?? fitToMode(rotateHue(accent, 150), mode)

  const frameMix = 0.14 + 0.3 * intensity
  const surfaceMix = 0.03 + 0.1 * intensity

  const line = theme?.line ?? mix(accent, surfaces.line, frameMix)
  const panel = theme?.surface ?? mix(accent, surfaces.panel, surfaceMix)

  return {
    '--accent': accent,
    '--accent-soft': withAlpha(accent, 0.16),
    '--major': major,
    '--minor': minor,
    '--on-minor': readableTextOn(minor),
    '--ring-check': markColorFor([accent, minor, major]),
    '--line': line,
    '--line-soft': theme?.line
      ? mix(theme.line, surfaces.lineSoft, 0.5)
      : mix(accent, surfaces.lineSoft, frameMix),
    '--panel': panel,
    '--panel-soft': mix(accent, surfaces.panelSoft, surfaceMix),
    '--ring-core': mix(accent, surfaces.ringCore, surfaceMix * 0.6),
    '--bg-blob-1': withAlpha(accent, 0.14),
    '--bg-blob-2': withAlpha(major, 0.08),
  }
}

export function buildGoalAccentVars(
  theme: GoalTheme | undefined,
  mode: ThemeMode,
): Record<string, string> {
  const accent = theme?.accent
  if (!accent) return {}

  const minor = theme.minor ?? accent
  const major = theme.major ?? fitToMode(rotateHue(accent, 150), mode)

  return {
    '--accent': accent,
    '--accent-soft': withAlpha(accent, 0.16),
    '--major': major,
    '--minor': minor,
    '--on-minor': readableTextOn(minor),
    '--ring-check': markColorFor([accent, minor, major]),
  }
}
