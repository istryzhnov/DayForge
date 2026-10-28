import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Goal } from '../../../entities/GoalEntity'
import { useTheme } from '../../../composables/useTheme'
import { GOAL_STATUS } from '../../../entities/constants'
import { START_VIEW, useSettings } from '../../../composables/useSettings'
import { FONT_LABEL_KEYS } from './settingsOptions'
import type { AppIconName } from '../../../components/appIconPaths'
import {
  SETTINGS_GROUP_LABEL_KEYS,
  SETTINGS_SECTIONS,
  type SettingsGroup,
  type SettingsSection,
} from './useSettingsPanel'
import {
  CLOCK_OPTIONS,
  DENSITY_OPTIONS,
  GOAL_STATUS_OPTIONS,
  LANGUAGE_OPTIONS,
  START_VIEW_OPTIONS,
} from './settingsOptions'

export type SettingsMenuRow = {
  id: SettingsSection
  icon: AppIconName
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

export function useSettingsMenu(props: MenuProps) {
  const { t } = useI18n()
  const { themeStyle, themeMode, palette, workspace } = useTheme()
  const { settings } = useSettings()

  /** Translated label of an option, or of a fallback key when none matches. */
  function labelOf<T>(
    options: readonly { id: T; labelKey: string }[],
    value: T,
    fallbackKey: string,
  ) {
    return t(
      options.find((option) => option.id === value)?.labelKey ?? fallbackKey,
    )
  }

  const summaries = computed<Record<SettingsSection, string>>(() => {
    const customCount = Object.keys(palette.value).length
    const { notifications, calendar, behavior, format, accessibility, timer } =
      settings

    return {
      theme: [
        t(
          themeStyle.value === 'vivid'
            ? 'settings.summaryThemeFresh'
            : 'settings.summaryThemeMinimal',
        ),
        t(
          themeMode.value === 'dark'
            ? 'settings.summaryThemeNight'
            : 'settings.summaryThemeDay',
        ),
      ].join(' · '),
      colors:
        customCount === 0
          ? t('settings.summaryColoursDefault')
          : t('settings.summaryColoursChanged', customCount),
      project: props.activeGoal
        ? [
            props.activeGoal.title,
            props.activeGoal.status === GOAL_STATUS.ACTIVE
              ? null
              : labelOf(
                  GOAL_STATUS_OPTIONS,
                  props.activeGoal.status,
                  'settings.statusActive',
                ),
            props.activeGoal.theme?.accent
              ? t('settings.summaryOwnColours')
              : t('settings.summaryThemeColours'),
            (props.activeGoal.hourlyRate ?? 0) > 0
              ? t('settings.summaryRate', { rate: props.activeGoal.hourlyRate })
              : null,
          ]
            .filter(Boolean)
            .join(' · ')
        : t('settings.summaryOpenProjectFirst'),
      workspace: [
        labelOf(
          DENSITY_OPTIONS,
          workspace.value.density,
          'settings.densityCozy',
        ),
        t(FONT_LABEL_KEYS[workspace.value.font]),
        accessibility.textScale === 1
          ? null
          : t('settings.summaryTextScale', {
              percent: Math.round(accessibility.textScale * 100),
            }),
      ]
        .filter(Boolean)
        .join(' · '),
      reminders: props.notificationsEnabled
        ? t('settings.summaryRemindersOn', {
            minutes: notifications.leadMinutes,
          })
        : t('settings.summaryOff'),
      calendar: t('settings.summaryCalendar', {
        minutes: calendar.snapMinutes,
        week:
          calendar.weekStartsOn === 1
            ? t('settings.summaryWeekFromMon')
            : t('settings.summaryWeekFromSun'),
      }),
      timer: t('settings.summaryTimer', {
        focus: timer.focusMinutes,
        rest: timer.shortBreakMinutes,
        every: timer.longBreakEvery,
      }),
      behavior: (() => {
        const view =
          behavior.startView === START_VIEW.GOALS && behavior.startGoalId
            ? t('settings.viewAProject')
            : labelOf(
                START_VIEW_OPTIONS,
                behavior.startView,
                'settings.viewAllTasks',
              )
        return behavior.keyboardShortcuts
          ? t('settings.summaryOpens', { view })
          : t('settings.summaryOpensNoShortcuts', { view })
      })(),
      format: [
        LANGUAGE_OPTIONS.find((option) => option.id === format.language)
          ?.label ?? 'English',
        labelOf(CLOCK_OPTIONS, format.clock, 'settings.clock24'),
      ].join(' · '),
      clients: t('settings.summaryClients', settings.billing.clients.length),
      data: t('settings.summaryData', {
        projects: t('settings.summaryProjects', props.dataStats.goals),
        tasks: t('settings.summaryTasks', props.dataStats.templates),
        kb: props.dataStats.kilobytes,
      }),
    }
  })

  const groups = computed<SettingsMenuGroup[]>(() => {
    const byGroup = new Map<SettingsGroup, SettingsMenuRow[]>()

    SETTINGS_SECTIONS.forEach((section) => {
      const rows = byGroup.get(section.group) ?? []
      rows.push({
        id: section.id,
        icon: section.icon,
        label: t(section.labelKey),
        summary: summaries.value[section.id],
        disabled: section.id === 'project' && !props.activeGoal,
      })
      byGroup.set(section.group, rows)
    })

    return [...byGroup].map(([id, rows]) => ({
      id,
      label: t(SETTINGS_GROUP_LABEL_KEYS[id]),
      rows,
    }))
  })

  return { groups }
}
