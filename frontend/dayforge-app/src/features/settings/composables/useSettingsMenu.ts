import { computed } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import { useTheme } from '../../../composables/useTheme'
import { LOCALE_OPTIONS, useSettings } from '../../../composables/useSettings'
import { FONT_LABELS } from '../../../composables/theme/tokens'
import {
  SETTINGS_GROUP_LABELS,
  SETTINGS_SECTIONS,
  type SettingsGroup,
  type SettingsSection,
} from './useSettingsPanel'
import {
  CLOCK_OPTIONS,
  DENSITY_OPTIONS,
  START_VIEW_OPTIONS,
} from './settingsOptions'

export type SettingsMenuRow = {
  id: SettingsSection
  icon: string
  label: string
  summary: string
  /** Sections that need something selected first are shown but not reachable. */
  disabled: boolean
}

export type SettingsMenuGroup = {
  id: SettingsGroup
  label: string
  rows: SettingsMenuRow[]
}

type MenuProps = {
  activeGoal: Goal | null
  notificationsEnabled: boolean
  dataStats: { goals: number; templates: number; kilobytes: number }
}

/** "1 project", "2 projects" — the menu reads as a sentence, not a log line. */
function plural(count: number, word: string) {
  return count + ' ' + word + (count === 1 ? '' : 's')
}

function labelOf<T>(
  options: readonly { id: T; label: string }[],
  value: T,
  fallback: string,
) {
  return options.find((option) => option.id === value)?.label ?? fallback
}

export function useSettingsMenu(props: MenuProps) {
  const { themeStyle, themeMode, palette, workspace } = useTheme()
  const { settings } = useSettings()

  const summaries = computed<Record<SettingsSection, string>>(() => {
    const customCount = Object.keys(palette.value).length
    const { notifications, calendar, behavior, format, accessibility } =
      settings

    return {
      theme: `${themeStyle.value === 'vivid' ? 'Fresh' : 'Minimal'} · ${
        themeMode.value === 'dark' ? 'Night' : 'Day'
      }`,
      colors:
        customCount === 0
          ? 'Theme defaults'
          : `${customCount} colour${customCount > 1 ? 's' : ''} changed`,
      project: props.activeGoal
        ? `${props.activeGoal.title} — ${
            props.activeGoal.theme?.accent ? 'own colours' : 'theme colours'
          }`
        : 'Open a project first',
      workspace: [
        labelOf(DENSITY_OPTIONS, workspace.value.density, 'Cozy'),
        FONT_LABELS[workspace.value.font],
        accessibility.textScale === 1
          ? null
          : `text ${Math.round(accessibility.textScale * 100)}%`,
      ]
        .filter(Boolean)
        .join(' · '),
      reminders: props.notificationsEnabled
        ? `On · ${notifications.leadMinutes} min before`
        : 'Off',
      calendar: `${calendar.snapMinutes} min steps · ${
        calendar.weekStartsOn === 1 ? 'week from Mon' : 'week from Sun'
      }`,
      behavior: `Opens ${labelOf(
        START_VIEW_OPTIONS,
        behavior.startView,
        'Projects',
      )}`,
      format: `${labelOf(LOCALE_OPTIONS, format.locale, 'Українська')} · ${labelOf(
        CLOCK_OPTIONS,
        format.clock,
        '24-hour',
      )}`,
      data: [
        plural(props.dataStats.goals, 'project'),
        plural(props.dataStats.templates, 'task'),
        `${props.dataStats.kilobytes} KB`,
      ].join(' · '),
    }
  })

  const groups = computed<SettingsMenuGroup[]>(() => {
    const byGroup = new Map<SettingsGroup, SettingsMenuRow[]>()

    SETTINGS_SECTIONS.forEach((section) => {
      const rows = byGroup.get(section.group) ?? []
      rows.push({
        id: section.id,
        icon: section.icon,
        label: section.label,
        summary: summaries.value[section.id],
        disabled: section.id === 'project' && !props.activeGoal,
      })
      byGroup.set(section.group, rows)
    })

    return [...byGroup].map(([id, rows]) => ({
      id,
      label: SETTINGS_GROUP_LABELS[id],
      rows,
    }))
  })

  return { groups }
}
