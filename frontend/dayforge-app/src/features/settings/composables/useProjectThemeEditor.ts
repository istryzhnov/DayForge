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
  type ThemeColorKey,
  type ThemeMode,
} from '../../../composables/theme/tokens'
import { suggestionsFor } from '../../../composables/theme/suggestions'

/**
 * The per-project palette editor.
 *
 * Two things make this more than a colour picker. The fields show the
 * *derived* values, not the stored ones, because a project usually only has an
 * accent and everything else is computed from it — those derived colours are
 * exactly what used to stay stubbornly default. And the suggestions are
 * generated against the project's own palette, so "complement" means the
 * complement of this project's colour rather than the global accent's.
 */

/** The colour fields a project can override by hand. */
export type GoalThemeColorKey = 'major' | 'minor' | 'line' | 'surface'

type EditorProps = {
  goal: Goal
  mode: ThemeMode
  surfaces: ThemeSurfaces
  palette: ResolvedPalette
}

type EditorActions = {
  onUpdate: (theme: GoalTheme | undefined) => void
}

export function useProjectThemeEditor(
  props: EditorProps,
  actions: EditorActions,
) {
  const presets: string[] = [...GOAL_COLOR_PRESETS]

  const theme = computed<GoalTheme>(() => props.goal.theme ?? {})
  const hasTheme = computed(() => Boolean(theme.value.accent))

  const vars = computed(() =>
    buildGoalThemeVars(theme.value, props.surfaces, props.mode),
  )

  const projectPalette = computed<ResolvedPalette>(() => ({
    ...props.palette,
    accent: theme.value.accent ?? props.palette.accent,
    major: vars.value['--major'] ?? props.palette.major,
    minor: vars.value['--minor'] ?? props.palette.minor,
    line: vars.value['--line'] ?? props.palette.line,
    panel: vars.value['--panel'] ?? props.palette.panel,
  }))

  const intensity = computed(
    () => theme.value.intensity ?? DEFAULT_GOAL_INTENSITY,
  )

  const accentValue = computed(
    () => vars.value['--accent'] ?? props.palette.accent,
  )

  const fields = computed(() => [
    {
      key: 'major' as GoalThemeColorKey,
      label: 'Project circles',
      description: 'Rows that hold other tasks, and their calendar blocks.',
      value: vars.value['--major'] ?? props.palette.major,
      isCustom: theme.value.major !== undefined,
      suggestions: suggestionsFor(
        THEME_COLOR_KEY.MAJOR,
        projectPalette.value,
        props.mode,
      ),
    },
    {
      key: 'minor' as GoalThemeColorKey,
      label: 'Task circles',
      description: 'Ordinary task circles inside this project.',
      value: vars.value['--minor'] ?? props.palette.minor,
      isCustom: theme.value.minor !== undefined,
      suggestions: suggestionsFor(
        THEME_COLOR_KEY.MINOR,
        projectPalette.value,
        props.mode,
      ),
    },
    {
      key: 'line' as GoalThemeColorKey,
      label: 'Borders',
      description: 'Frames and dividers inside the panel.',
      value: vars.value['--line'] ?? props.palette.line,
      isCustom: theme.value.line !== undefined,
      suggestions: suggestionsFor(
        THEME_COLOR_KEY.LINE,
        projectPalette.value,
        props.mode,
      ),
    },
    {
      key: 'surface' as GoalThemeColorKey,
      label: 'Panels',
      description: 'Cards and raised surfaces inside the panel.',
      value: vars.value['--panel'] ?? props.palette.panel,
      isCustom: theme.value.surface !== undefined,
      suggestions: suggestionsFor(
        THEME_COLOR_KEY.PANEL,
        projectPalette.value,
        props.mode,
      ),
    },
  ])

  const accentSuggestions = computed(() =>
    suggestionsFor(
      THEME_COLOR_KEY.ACCENT as ThemeColorKey,
      projectPalette.value,
      props.mode,
    ),
  )

  function pickAccent(color: string) {
    actions.onUpdate({ ...theme.value, accent: color })
  }

  function setField(key: GoalThemeColorKey, color: string) {
    actions.onUpdate({ ...theme.value, [key]: color })
  }

  function clearField(key: GoalThemeColorKey) {
    const next: GoalTheme = { ...theme.value }
    delete next[key]
    actions.onUpdate(next)
  }

  function setIntensityPercent(percent: number) {
    actions.onUpdate({ ...theme.value, intensity: percent / 100 })
  }

  /** No accent means no theme at all, so clearing it clears the whole set. */
  function clearTheme() {
    actions.onUpdate(undefined)
  }

  return {
    presets,
    theme,
    hasTheme,
    vars,
    intensity,
    accentValue,
    accentSuggestions,
    fields,
    pickAccent,
    setField,
    clearField,
    setIntensityPercent,
    clearTheme,
  }
}
