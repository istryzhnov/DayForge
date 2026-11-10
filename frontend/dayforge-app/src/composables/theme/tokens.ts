import {
  darken,
  lighten,
  mix,
  readableButtonTextOn,
  readableTextOn,
  withAlpha,
} from './color'

export type ThemeMode = 'light' | 'dark'
export type ThemeStyle = 'vivid' | 'minimal'

export const THEME_COLOR_KEY = {
  ACCENT: 'accent',
  MAJOR: 'major',
  MINOR: 'minor',
  BG: 'bg',
  PANEL: 'panel',
  LINE: 'line',
  TEXT: 'text',
  MUTED: 'muted',
  DANGER: 'danger',
} as const

export type ThemeColorKey =
  (typeof THEME_COLOR_KEY)[keyof typeof THEME_COLOR_KEY]

export type ThemePalette = Partial<Record<ThemeColorKey, string>>
export type ResolvedPalette = Record<ThemeColorKey, string>

export interface ColorTokenMeta {
  key: ThemeColorKey
  /** The custom property the value is written to. */
  cssVar: string
  /** Message keys, rendered with t() where the colour is shown. */
  labelKey: string
  descriptionKey: string
  group: 'primary' | 'surface' | 'secondary'
}

export const COLOR_TOKENS: ColorTokenMeta[] = [
  {
    key: THEME_COLOR_KEY.ACCENT,
    cssVar: '--accent',
    labelKey: 'settings.tokenAccent',
    descriptionKey: 'settings.tokenAccentDescription',
    group: 'primary',
  },
  {
    key: THEME_COLOR_KEY.MAJOR,
    cssVar: '--major',
    labelKey: 'settings.tokenProjects',
    descriptionKey: 'settings.tokenProjectsDescription',
    group: 'primary',
  },
  {
    key: THEME_COLOR_KEY.MINOR,
    cssVar: '--minor',
    labelKey: 'settings.tokenTasks',
    descriptionKey: 'settings.tokenTasksDescription',
    group: 'primary',
  },
  {
    key: THEME_COLOR_KEY.BG,
    cssVar: '--bg',
    labelKey: 'settings.tokenBackground',
    descriptionKey: 'settings.tokenBackgroundDescription',
    group: 'surface',
  },
  {
    key: THEME_COLOR_KEY.PANEL,
    cssVar: '--panel',
    labelKey: 'settings.tokenPanels',
    descriptionKey: 'settings.tokenPanelsDescription',
    group: 'surface',
  },
  {
    key: THEME_COLOR_KEY.LINE,
    cssVar: '--line',
    labelKey: 'settings.tokenBorders',
    descriptionKey: 'settings.tokenBordersDescription',
    group: 'surface',
  },
  {
    key: THEME_COLOR_KEY.TEXT,
    cssVar: '--text',
    labelKey: 'settings.tokenText',
    descriptionKey: 'settings.tokenTextDescription',
    group: 'secondary',
  },
  {
    key: THEME_COLOR_KEY.MUTED,
    cssVar: '--muted',
    labelKey: 'settings.tokenSecondaryText',
    descriptionKey: 'settings.tokenSecondaryTextDescription',
    group: 'secondary',
  },
  {
    key: THEME_COLOR_KEY.DANGER,
    cssVar: '--danger',
    labelKey: 'settings.tokenDanger',
    descriptionKey: 'settings.tokenDangerDescription',
    group: 'secondary',
  },
]

/** Every custom property this module writes, so a reset can clear them all. */
export const MANAGED_CSS_VARS: string[] = [
  ...COLOR_TOKENS.map((token) => token.cssVar),
  '--accent-soft',
  '--ring-check',
  '--ring-core',
  '--on-minor',
  '--panel-soft',
  '--panel-layer',
  '--line-soft',
  '--bg-base',
  '--bg-blob-1',
  '--bg-blob-2',
  '--radius-scale',
  '--density-scale',
  '--panel-blur',
  '--font-ui',
]

// --- workspace (non-colour) options ---------------------------------------

export const FONT_OPTION = {
  MANROPE: 'manrope',
  SYSTEM: 'system',
  SERIF: 'serif',
  MONO: 'mono',
  ROUNDED: 'rounded',
} as const

export type FontOption = (typeof FONT_OPTION)[keyof typeof FONT_OPTION]

export const FONT_STACKS: Record<FontOption, string> = {
  [FONT_OPTION.MANROPE]: "'Manrope', 'Segoe UI', sans-serif",
  [FONT_OPTION.SYSTEM]: "'Segoe UI', system-ui, -apple-system, sans-serif",
  [FONT_OPTION.SERIF]: "'Iowan Old Style', Georgia, 'Times New Roman', serif",
  [FONT_OPTION.MONO]: "'JetBrains Mono', 'Cascadia Mono', Consolas, monospace",
  [FONT_OPTION.ROUNDED]: "'Nunito', 'Trebuchet MS', 'Segoe UI', sans-serif",
}

export const DENSITY = {
  COMPACT: 'compact',
  COZY: 'cozy',
  ROOMY: 'roomy',
} as const

export type Density = (typeof DENSITY)[keyof typeof DENSITY]

export const DENSITY_SCALE: Record<Density, number> = {
  [DENSITY.COMPACT]: 0.8,
  [DENSITY.COZY]: 1,
  [DENSITY.ROOMY]: 1.2,
}

export const BACKGROUND_PATTERN = {
  NONE: 'none',
  GLOW: 'glow',
  GRID: 'grid',
  DOTS: 'dots',
} as const

export type BackgroundPattern =
  (typeof BACKGROUND_PATTERN)[keyof typeof BACKGROUND_PATTERN]

export const MOTION = {
  FULL: 'full',
  REDUCED: 'reduced',
} as const

export type Motion = (typeof MOTION)[keyof typeof MOTION]

export interface WorkspaceSettings {
  /** Multiplier applied to every non-pill corner radius. */
  radiusScale: number
  density: Density
  pattern: BackgroundPattern
  /** Multiplier on the background glow's opacity. */
  glow: number
  /** Backdrop blur behind translucent panels, in px. */
  blur: number
  font: FontOption
  motion: Motion
}

export const DEFAULT_WORKSPACE: WorkspaceSettings = {
  radiusScale: 1,
  density: DENSITY.COZY,
  pattern: BACKGROUND_PATTERN.GLOW,
  glow: 1,
  blur: 8,
  font: FONT_OPTION.MANROPE,
  motion: MOTION.FULL,
}

// --- derivation ------------------------------------------------------------

function stripEmpty(palette: ThemePalette): ThemePalette {
  const result: ThemePalette = {}
  for (const [key, value] of Object.entries(palette)) {
    if (value) result[key as ThemeColorKey] = value
  }
  return result
}

export function buildPaletteVars(
  custom: ThemePalette,
  base: ResolvedPalette,
  mode: ThemeMode,
  workspace: WorkspaceSettings,
): Record<string, string> {
  const vars: Record<string, string> = {}
  const picked = stripEmpty(custom)
  const effective = { ...base, ...picked }
  const isDark = mode === 'dark'

  for (const token of COLOR_TOKENS) {
    const value = picked[token.key]
    if (value) vars[token.cssVar] = value
  }

  if (picked.accent) {
    vars['--accent-soft'] = withAlpha(picked.accent, isDark ? 0.16 : 0.14)
    vars['--ring-check'] = readableButtonTextOn(picked.accent)
  }

  if (picked.minor) {
    vars['--on-minor'] = readableTextOn(picked.minor)
  }

  if (picked.panel) {
    const panel = picked.panel
    vars['--panel-soft'] = isDark ? lighten(panel, 4) : darken(panel, 3)
    vars['--panel-layer'] = `linear-gradient(160deg, ${
      isDark ? lighten(panel, 2) : '#ffffff'
    }, ${isDark ? panel : darken(panel, 2)})`
    vars['--ring-core'] = isDark ? darken(panel, 3) : lighten(panel, 2)
  }

  if (picked.bg) {
    const bg = picked.bg
    vars['--bg-base'] = `linear-gradient(160deg, ${bg} 0%, ${
      isDark ? lighten(bg, 2.5) : darken(bg, 1.5)
    } 58%, ${bg} 100%)`
  }

  if (picked.line) {
    vars['--line-soft'] = isDark
      ? lighten(picked.line, 10)
      : darken(picked.line, 10)
  }

  if (picked.text && !picked.muted) {
    vars['--muted'] = mix(effective.text, effective.panel, 0.62)
  }

  if (workspace.glow !== 1 || picked.accent || picked.minor) {
    vars['--bg-blob-1'] = withAlpha(effective.accent, 0.12 * workspace.glow)
    vars['--bg-blob-2'] = withAlpha(effective.minor, 0.1 * workspace.glow)
  }

  return vars
}

/** The non-colour half of the workspace: sizes, blur and typeface. */
export function buildWorkspaceVars(
  workspace: WorkspaceSettings,
): Record<string, string> {
  return {
    '--radius-scale': String(workspace.radiusScale),
    '--density-scale': String(DENSITY_SCALE[workspace.density]),
    '--panel-blur': `${workspace.blur}px`,
    '--font-ui': FONT_STACKS[workspace.font],
  }
}

// --- curated palettes ------------------------------------------------------

export interface PalettePreset {
  id: string
  /** Message keys: the names are translated where the gallery shows them. */
  nameKey: string
  hintKey: string
  /** The mode the palette was designed for first. */
  mode: ThemeMode
  style: ThemeStyle
  colors: ThemePalette
  /**
   * The same palette for the other mode, so Day / Night never leaves a dark
   * canvas in day mode (or the reverse). {} means the stylesheet's own values.
   */
  twin: ThemePalette
}

export const PALETTE_PRESETS: PalettePreset[] = [
  {
    id: 'forge',
    nameKey: 'settings.paletteForge',
    hintKey: 'settings.paletteForgeHint',
    mode: 'dark',
    style: 'vivid',
    colors: {},
    twin: {},
  },
  {
    id: 'evergreen',
    nameKey: 'settings.paletteEvergreen',
    hintKey: 'settings.paletteEvergreenHint',
    mode: 'dark',
    style: 'vivid',
    colors: {
      accent: '#3ddc84',
      major: '#ffa53d',
      minor: '#3ddc84',
      bg: '#0b1210',
      panel: '#111a17',
      line: '#22322c',
      text: '#e9f5ef',
      muted: '#8fa79c',
    },
    twin: {
      accent: '#18773f',
      major: '#d9480f',
      minor: '#18773f',
      bg: '#f3f8f5',
      panel: '#ffffff',
      line: '#d6e5dc',
      text: '#11211a',
      muted: '#5a7266',
    },
  },
  {
    id: 'ocean',
    nameKey: 'settings.paletteDeepOcean',
    hintKey: 'settings.paletteDeepOceanHint',
    mode: 'dark',
    style: 'vivid',
    colors: {
      accent: '#38bdf8',
      major: '#f472b6',
      minor: '#38bdf8',
      bg: '#0a1220',
      panel: '#111c2e',
      line: '#22334d',
      text: '#e8f1ff',
      muted: '#8ea5c2',
    },
    twin: {
      accent: '#0272b0',
      major: '#c2255c',
      minor: '#0272b0',
      bg: '#f1f6fc',
      panel: '#ffffff',
      line: '#d5e1ef',
      text: '#0f1b2d',
      muted: '#5b6f8a',
    },
  },
  {
    id: 'sunset',
    nameKey: 'settings.paletteSunset',
    hintKey: 'settings.paletteSunsetHint',
    mode: 'dark',
    style: 'vivid',
    colors: {
      accent: '#ffb347',
      major: '#ff5d8f',
      minor: '#ffb347',
      bg: '#150f1b',
      panel: '#1e1626',
      line: '#33263f',
      text: '#f8eef6',
      muted: '#b39cb6',
    },
    twin: {
      accent: '#b35c06',
      major: '#d6336c',
      minor: '#b35c06',
      bg: '#fbf6f3',
      panel: '#ffffff',
      line: '#ecdfe5',
      text: '#2a1b2e',
      muted: '#7d6a80',
    },
  },
  {
    id: 'grape',
    nameKey: 'settings.paletteGrape',
    hintKey: 'settings.paletteGrapeHint',
    mode: 'dark',
    style: 'minimal',
    colors: {
      accent: '#9b6bff',
      major: '#ff8fab',
      minor: '#9b6bff',
      bg: '#0c0a12',
      panel: '#151221',
      line: '#2a2340',
      text: '#f0ecff',
      muted: '#a096c2',
    },
    twin: {
      accent: '#6d3fe6',
      major: '#d6336c',
      minor: '#6d3fe6',
      bg: '#f6f4fc',
      panel: '#ffffff',
      line: '#e1dbf2',
      text: '#1c1530',
      muted: '#6c6488',
    },
  },
  {
    id: 'slate',
    nameKey: 'settings.paletteSlate',
    hintKey: 'settings.paletteSlateHint',
    mode: 'dark',
    style: 'minimal',
    colors: {
      accent: '#a3a3a3',
      major: '#e5e5e5',
      minor: '#8a8a8a',
      bg: '#0b0b0c',
      panel: '#141416',
      line: '#2a2a2d',
      text: '#f2f2f2',
      muted: '#9a9a9f',
    },
    twin: {
      accent: '#3f3f46',
      major: '#18181b',
      minor: '#71717a',
      bg: '#f7f7f7',
      panel: '#ffffff',
      line: '#e2e2e2',
      text: '#171717',
      muted: '#6b6b6b',
    },
  },
  {
    id: 'paper',
    nameKey: 'settings.palettePaper',
    hintKey: 'settings.palettePaperHint',
    mode: 'light',
    style: 'minimal',
    colors: {
      accent: '#c2410c',
      major: '#c2410c',
      minor: '#3f3f46',
      bg: '#faf7f2',
      panel: '#ffffff',
      line: '#e4ded3',
      text: '#1c1917',
      muted: '#6b6259',
    },
    twin: {
      accent: '#f97316',
      major: '#f97316',
      minor: '#d4d4d8',
      bg: '#14110f',
      panel: '#1c1815',
      line: '#332d27',
      text: '#f5efe6',
      muted: '#a89c8f',
    },
  },
  {
    id: 'meadow',
    nameKey: 'settings.paletteMeadow',
    hintKey: 'settings.paletteMeadowHint',
    mode: 'light',
    style: 'vivid',
    colors: {
      accent: '#2f9e44',
      major: '#e8590c',
      minor: '#1c7ed6',
      bg: '#f2f8f3',
      panel: '#ffffff',
      line: '#d8e6da',
      text: '#132218',
      muted: '#5c7364',
    },
    twin: {
      accent: '#51cf66',
      major: '#ff922b',
      minor: '#4dabf7',
      bg: '#0c140f',
      panel: '#131d16',
      line: '#24352a',
      text: '#e8f5ec',
      muted: '#8ea898',
    },
  },
]

export function findPreset(id: string | null | undefined) {
  return PALETTE_PRESETS.find((preset) => preset.id === id)
}

/** A palette's colours in the given mode: its own, or its twin's. */
export function presetColorsFor(
  preset: PalettePreset,
  mode: ThemeMode,
): ThemePalette {
  return mode === preset.mode ? preset.colors : preset.twin
}

/** Same colours on the same keys, whatever order they were picked in. */
export function samePalette(a: ThemePalette, b: ThemePalette): boolean {
  const keysA = Object.keys(stripEmpty(a))
  const keysB = Object.keys(stripEmpty(b))
  return (
    keysA.length === keysB.length &&
    keysA.every((key) => a[key as ThemeColorKey] === b[key as ThemeColorKey])
  )
}

/**
 * The preset a stored theme sits on. A stored id wins when it names a real
 * preset; otherwise the theme counts as a preset only when style, mode and
 * colours all match one. Anything else is a custom theme, so null.
 */
export function presetIdFor(
  stored: unknown,
  style: ThemeStyle,
  mode: ThemeMode,
  colors: ThemePalette,
): string | null {
  if (
    typeof stored === 'string' &&
    PALETTE_PRESETS.some((preset) => preset.id === stored)
  ) {
    return stored
  }
  return (
    PALETTE_PRESETS.find(
      (preset) =>
        preset.style === style &&
        samePalette(presetColorsFor(preset, mode), colors),
    )?.id ?? null
  )
}

/**
 * The colours a reset goes back to: the remembered palette in the mode now in
 * force. A theme whose style no longer matches its palette (an old stored one)
 * falls back to {}, the stylesheet's designed values.
 */
export function presetBaseColors(
  presetId: string | null,
  style: ThemeStyle,
  mode: ThemeMode,
): ThemePalette {
  const preset = findPreset(presetId)
  if (!preset || preset.style !== style) return {}
  return presetColorsFor(preset, mode)
}
