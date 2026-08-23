/**
 * The vocabulary of the appearance panel: which CSS custom properties a user
 * may repaint, what each one is called in plain words, and how the rest of the
 * palette is derived from the handful of colours they actually pick.
 *
 * Deriving is what keeps a custom colour from looking half-applied — choosing
 * an accent also repaints the soft tint behind it, the check mark drawn on top
 * of it and the glow behind the workspace.
 */

import { darken, lighten, mix, readableTextOn, withAlpha } from './color'

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
  label: string
  description: string
  group: 'primary' | 'surface' | 'secondary'
}

export const COLOR_TOKENS: ColorTokenMeta[] = [
  {
    key: THEME_COLOR_KEY.ACCENT,
    cssVar: '--accent',
    label: 'Accent',
    description: 'Primary colour: buttons, progress rings, active states.',
    group: 'primary',
  },
  {
    key: THEME_COLOR_KEY.MAJOR,
    cssVar: '--major',
    label: 'Projects',
    description: 'Project circles, badges and calendar blocks.',
    group: 'primary',
  },
  {
    key: THEME_COLOR_KEY.MINOR,
    cssVar: '--minor',
    label: 'Tasks',
    description: 'Ordinary task circles and their calendar blocks.',
    group: 'primary',
  },
  {
    key: THEME_COLOR_KEY.BG,
    cssVar: '--bg',
    label: 'Background',
    description: 'The canvas behind every panel.',
    group: 'surface',
  },
  {
    key: THEME_COLOR_KEY.PANEL,
    cssVar: '--panel',
    label: 'Panels',
    description: 'Cards, the sidebar and every raised surface.',
    group: 'surface',
  },
  {
    key: THEME_COLOR_KEY.LINE,
    cssVar: '--line',
    label: 'Borders',
    description: 'Frames, dividers and outlines.',
    group: 'surface',
  },
  {
    key: THEME_COLOR_KEY.TEXT,
    cssVar: '--text',
    label: 'Text',
    description: 'Titles and body copy.',
    group: 'secondary',
  },
  {
    key: THEME_COLOR_KEY.MUTED,
    cssVar: '--muted',
    label: 'Secondary text',
    description: 'Captions, counters and hints.',
    group: 'secondary',
  },
  {
    key: THEME_COLOR_KEY.DANGER,
    cssVar: '--danger',
    label: 'Danger',
    description: 'Delete actions and warnings.',
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

export const FONT_LABELS: Record<FontOption, string> = {
  [FONT_OPTION.MANROPE]: 'Manrope',
  [FONT_OPTION.SYSTEM]: 'System',
  [FONT_OPTION.SERIF]: 'Serif',
  [FONT_OPTION.MONO]: 'Mono',
  [FONT_OPTION.ROUNDED]: 'Rounded',
}

export const DENSITY = {
  COMPACT: 'compact',
  COZY: 'cozy',
  ROOMY: 'roomy',
} as const

export type Density = (typeof DENSITY)[keyof typeof DENSITY]

/**
 * Spacing is scaled by a multiplier rather than by per-component overrides:
 * the handful of paddings and gaps that carry the layout are written as
 * `calc(Npx * var(--density-scale))`, so the responsive rules keep working
 * instead of being trampled by a `[data-density]` selector.
 */
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

/**
 * Turns the colours a user picked into the full set of custom properties the
 * stylesheets read. A token is only emitted when its source colour was actually
 * customised, so an untouched theme keeps the hand-tuned values from
 * `layout.css` instead of a flattened, computed approximation of them.
 */
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
    vars['--ring-check'] = readableTextOn(picked.accent)
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

  // Captions have to follow the text colour, or a repainted theme leaves them
  // stranded at the old contrast.
  if (picked.text && !picked.muted) {
    vars['--muted'] = mix(effective.text, effective.panel, 0.62)
  }

  // The glow belongs to the workspace rather than to one colour, so it is
  // rewritten whenever the user moved the slider or repainted its sources.
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
  name: string
  hint: string
  mode: ThemeMode
  style: ThemeStyle
  colors: ThemePalette
}

export const PALETTE_PRESETS: PalettePreset[] = [
  {
    id: 'forge',
    name: 'Forge',
    hint: 'The DayForge original: neon lime on deep navy.',
    mode: 'dark',
    style: 'vivid',
    colors: {},
  },
  {
    id: 'daylight',
    name: 'Daylight',
    hint: 'The built-in light theme, untouched.',
    mode: 'light',
    style: 'vivid',
    colors: {},
  },
  {
    id: 'evergreen',
    name: 'Evergreen',
    hint: 'Green against charcoal — the calm classic pairing.',
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
  },
  {
    id: 'ocean',
    name: 'Deep ocean',
    hint: 'Cyan and rose: cool, low-glare, easy at night.',
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
  },
  {
    id: 'sunset',
    name: 'Sunset',
    hint: 'Warm amber against plum — high energy.',
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
  },
  {
    id: 'grape',
    name: 'Grape',
    hint: 'Violet accent on a near-black canvas.',
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
  },
  {
    id: 'slate',
    name: 'Slate',
    hint: 'Monochrome greys — nothing competes for attention.',
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
  },
  {
    id: 'paper',
    name: 'Paper',
    hint: 'Warm off-white with ink — daylight reading.',
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
  },
  {
    id: 'meadow',
    name: 'Meadow',
    hint: 'Fresh green on a bright, airy canvas.',
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
  },
]
