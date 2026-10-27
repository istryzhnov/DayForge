import { computed, ref, watch } from 'vue'
import {
  BACKGROUND_PATTERN,
  COLOR_TOKENS,
  DEFAULT_WORKSPACE,
  DENSITY,
  FONT_OPTION,
  MANAGED_CSS_VARS,
  MOTION,
  PALETTE_PRESETS,
  buildPaletteVars,
  buildWorkspaceVars,
  presetBaseColors,
  presetIdFor,
  type PalettePreset,
  type ResolvedPalette,
  type ThemeColorKey,
  type ThemeMode,
  type ThemePalette,
  type ThemeStyle,
  type WorkspaceSettings,
} from './theme/tokens'
import type { ThemeSurfaces } from './theme/goalTheme'
import { readJson, writeJson } from '../lib/storage'

export type { ThemeMode, ThemeStyle } from './theme/tokens'

const THEME_STORAGE_KEY = 'dayforge-theme-v1'

/**
 * Bumped when the default theme changed. A stored theme from before it that
 * still sits on the old default (Forge) moves to the new one; a theme the
 * user actually picked stays.
 */
const THEME_VERSION = 2

/** The theme everyone starts on. */
export const DEFAULT_PRESET: PalettePreset =
  PALETTE_PRESETS.find((preset) => preset.id === 'sunset') ?? PALETTE_PRESETS[0]

const themeStyle = ref<ThemeStyle>(DEFAULT_PRESET.style)
const themeMode = ref<ThemeMode>(DEFAULT_PRESET.mode)
/** Colours the user picked by hand. Anything absent keeps the designed value. */
const palette = ref<ThemePalette>({ ...DEFAULT_PRESET.colors })
/**
 * The preset the user last applied, or null for a custom theme. Reset goes
 * back to its colours rather than to the stylesheet's Forge defaults.
 */
const presetId = ref<string | null>(DEFAULT_PRESET.id)
const workspace = ref<WorkspaceSettings>({ ...DEFAULT_WORKSPACE })

const themeRevision = ref(0)

let initialized = false

function isThemeStyle(value: unknown): value is ThemeStyle {
  return value === 'vivid' || value === 'minimal'
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark'
}

/** Values used only until the stylesheet has been read once. */
const PALETTE_FALLBACK: ResolvedPalette = {
  accent: '#73ff44',
  major: '#ff7a2f',
  minor: '#23c7eb',
  bg: '#0c111a',
  panel: '#151d29',
  line: '#2b3649',
  text: '#eef4ff',
  muted: '#9caec3',
  danger: '#ef4444',
}

function readVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
  return value || fallback
}

/** What the stylesheet alone provides, with every inline override cleared. */
function readBasePalette(): ResolvedPalette {
  const result = { ...PALETTE_FALLBACK }
  for (const token of COLOR_TOKENS) {
    result[token.key] = readVar(token.cssVar, PALETTE_FALLBACK[token.key])
  }
  return result
}

function sanitizeWorkspace(input: unknown): WorkspaceSettings {
  const raw = (
    typeof input === 'object' && input !== null ? input : {}
  ) as Partial<WorkspaceSettings>
  const clamp = (value: unknown, min: number, max: number, fallback: number) =>
    typeof value === 'number' && Number.isFinite(value)
      ? Math.min(max, Math.max(min, value))
      : fallback

  const oneOf = <T extends string>(
    value: unknown,
    allowed: readonly T[],
    fallback: T,
  ): T => (allowed.includes(value as T) ? (value as T) : fallback)

  return {
    ...raw,
    radiusScale: clamp(raw.radiusScale, 0, 2, DEFAULT_WORKSPACE.radiusScale),
    glow: clamp(raw.glow, 0, 2.5, DEFAULT_WORKSPACE.glow),
    blur: clamp(raw.blur, 0, 24, DEFAULT_WORKSPACE.blur),
    density: oneOf(
      raw.density,
      Object.values(DENSITY),
      DEFAULT_WORKSPACE.density,
    ),
    pattern: oneOf(
      raw.pattern,
      Object.values(BACKGROUND_PATTERN),
      DEFAULT_WORKSPACE.pattern,
    ),
    font: oneOf(raw.font, Object.values(FONT_OPTION), DEFAULT_WORKSPACE.font),
    motion: oneOf(raw.motion, Object.values(MOTION), DEFAULT_WORKSPACE.motion),
  }
}

function sanitizePalette(input: unknown): ThemePalette {
  const raw = (
    typeof input === 'object' && input !== null ? input : {}
  ) as Record<string, unknown>
  const result = { ...raw } as Record<string, unknown>
  for (const token of COLOR_TOKENS) {
    const value = raw[token.key]
    if (typeof value === 'string' && CSS.supports('color', value.trim())) {
      result[token.key] = value.trim()
    } else {
      delete result[token.key]
    }
  }
  return result as ThemePalette
}

function applyThemeToDocument() {
  const root = document.documentElement
  root.dataset.themeStyle = themeStyle.value
  root.dataset.themeMode = themeMode.value
  root.dataset.density = workspace.value.density
  root.dataset.pattern = workspace.value.pattern
  root.dataset.motion = workspace.value.motion

  MANAGED_CSS_VARS.forEach((name) => root.style.removeProperty(name))

  const base = readBasePalette()
  const vars = {
    ...buildPaletteVars(palette.value, base, themeMode.value, workspace.value),
    ...buildWorkspaceVars(workspace.value),
  }

  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value)
  }

  themeRevision.value += 1
}

function persist() {
  writeJson(THEME_STORAGE_KEY, {
    v: THEME_VERSION,
    style: themeStyle.value,
    mode: themeMode.value,
    colors: palette.value,
    preset: presetId.value,
    workspace: workspace.value,
  })
}

/** Forge with no colours of its own: the default before Sunset took over. */
function isOldDefault(style: unknown, mode: unknown, colors: ThemePalette) {
  return (
    style === 'vivid' && mode === 'dark' && Object.keys(colors).length === 0
  )
}

function initializeTheme() {
  if (initialized) return
  initialized = true

  try {
    const parsed = readJson<{
      v?: number
      style?: ThemeStyle
      mode?: ThemeMode
      colors?: unknown
      preset?: unknown
      workspace?: unknown
    } | null>(THEME_STORAGE_KEY, null)
    if (parsed) {
      const colors = sanitizePalette(parsed.colors)
      workspace.value = sanitizeWorkspace(parsed.workspace)

      const onOldDefault =
        (parsed.v ?? 1) < THEME_VERSION &&
        isOldDefault(parsed.style, parsed.mode, colors)

      // The old default migrates to Sunset, so presetId keeps its initial value.
      if (!onOldDefault) {
        if (isThemeStyle(parsed.style)) themeStyle.value = parsed.style
        if (isThemeMode(parsed.mode)) themeMode.value = parsed.mode
        palette.value = colors
        // Themes saved before the preset was remembered are matched by value.
        presetId.value = presetIdFor(
          parsed.preset,
          themeStyle.value,
          themeMode.value,
          colors,
        )
      }
    }
  } catch {
    // Ignore malformed theme data and use defaults.
  }

  watch(
    [themeStyle, themeMode, palette, presetId, workspace],
    () => {
      applyThemeToDocument()
      persist()
    },
    { immediate: true, deep: true },
  )
}

export function useTheme() {
  initializeTheme()

  /** The colours actually in force, custom picks included. */
  const effectivePalette = computed<ResolvedPalette>(() => {
    void themeRevision.value
    const result = { ...PALETTE_FALLBACK }
    for (const token of COLOR_TOKENS) {
      result[token.key] = readVar(token.cssVar, PALETTE_FALLBACK[token.key])
    }
    return result
  })

  /** The surfaces a per-project colour tints, as they stand right now. */
  const surfaces = computed<ThemeSurfaces>(() => {
    void themeRevision.value
    return {
      panel: readVar('--panel', PALETTE_FALLBACK.panel),
      panelSoft: readVar('--panel-soft', '#1d2838'),
      line: readVar('--line', PALETTE_FALLBACK.line),
      lineSoft: readVar('--line-soft', '#3a4a61'),
      ringCore: readVar('--ring-core', '#111a29'),
      text: readVar('--text', PALETTE_FALLBACK.text),
    }
  })

  const customizedKeys = computed(
    () => Object.keys(palette.value) as ThemeColorKey[],
  )

  const isCustomized = computed(
    () =>
      customizedKeys.value.length > 0 ||
      JSON.stringify(workspace.value) !== JSON.stringify(DEFAULT_WORKSPACE),
  )

  function setColor(key: ThemeColorKey, value: string) {
    palette.value = { ...palette.value, [key]: value }
  }

  /** One colour goes back to the preset's value, or the designed one. */
  function resetColor(key: ThemeColorKey) {
    const base = presetBaseColors(
      presetId.value,
      themeStyle.value,
      themeMode.value,
    )
    const next = { ...palette.value }
    if (base[key] !== undefined) next[key] = base[key]
    else delete next[key]
    palette.value = next
  }

  function resetPalette() {
    palette.value = {
      ...presetBaseColors(presetId.value, themeStyle.value, themeMode.value),
    }
  }

  function applyPreset(preset: PalettePreset) {
    themeStyle.value = preset.style
    themeMode.value = preset.mode
    palette.value = { ...preset.colors }
    presetId.value = preset.id
  }

  function setWorkspace(patch: Partial<WorkspaceSettings>) {
    workspace.value = sanitizeWorkspace({ ...workspace.value, ...patch })
  }

  function resetWorkspace() {
    workspace.value = { ...DEFAULT_WORKSPACE }
  }

  function resetAll() {
    applyPreset(DEFAULT_PRESET)
    resetWorkspace()
  }

  return {
    themeStyle,
    themeMode,
    palette,
    workspace,
    themeRevision,
    effectivePalette,
    surfaces,
    customizedKeys,
    isCustomized,
    setThemeStyle: (nextStyle: ThemeStyle) => {
      themeStyle.value = nextStyle
    },
    setThemeMode: (nextMode: ThemeMode) => {
      themeMode.value = nextMode
    },
    setColor,
    resetColor,
    resetPalette,
    applyPreset,
    setWorkspace,
    resetWorkspace,
    resetAll,
  }
}
