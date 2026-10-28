import { ref } from 'vue'
import type { AppIconName } from '../../../components/appIconPaths'

export const SETTINGS_SECTION = {
  THEME: 'theme',
  COLORS: 'colors',
  PROJECT: 'project',
  WORKSPACE: 'workspace',
  REMINDERS: 'reminders',
  CALENDAR: 'calendar',
  TIMER: 'timer',
  BEHAVIOR: 'behavior',
  FORMAT: 'format',
  CLIENTS: 'clients',
  DATA: 'data',
} as const

export type SettingsSection =
  (typeof SETTINGS_SECTION)[keyof typeof SETTINGS_SECTION]

export const SETTINGS_GROUP = {
  APPEARANCE: 'appearance',
  PLANNER: 'planner',
  DATA: 'data',
} as const

export type SettingsGroup = (typeof SETTINGS_GROUP)[keyof typeof SETTINGS_GROUP]

export interface SettingsSectionMeta {
  id: SettingsSection
  group: SettingsGroup
  icon: AppIconName
  /** Message key for the section's name. */
  labelKey: string
  /** Message key for the line shown under the title once the section is open. */
  descriptionKey: string
}

export const SETTINGS_SECTIONS: SettingsSectionMeta[] = [
  {
    id: SETTINGS_SECTION.THEME,
    group: SETTINGS_GROUP.APPEARANCE,
    icon: 'palette',
    labelKey: 'settings.sectionTheme',
    descriptionKey: 'settings.sectionThemeHint',
  },
  {
    id: SETTINGS_SECTION.COLORS,
    group: SETTINGS_GROUP.APPEARANCE,
    icon: 'target',
    labelKey: 'settings.sectionColours',
    descriptionKey: 'settings.sectionColoursHint',
  },
  {
    id: SETTINGS_SECTION.PROJECT,
    group: SETTINGS_GROUP.APPEARANCE,
    icon: 'tag',
    labelKey: 'settings.sectionProject',
    descriptionKey: 'settings.sectionProjectHint',
  },
  {
    id: SETTINGS_SECTION.WORKSPACE,
    group: SETTINGS_GROUP.APPEARANCE,
    icon: 'ruler',
    labelKey: 'settings.sectionWorkspace',
    descriptionKey: 'settings.sectionWorkspaceHint',
  },
  {
    id: SETTINGS_SECTION.REMINDERS,
    group: SETTINGS_GROUP.PLANNER,
    icon: 'bell',
    labelKey: 'settings.sectionReminders',
    descriptionKey: 'settings.sectionRemindersHint',
  },
  {
    id: SETTINGS_SECTION.CALENDAR,
    group: SETTINGS_GROUP.PLANNER,
    icon: 'calendar',
    labelKey: 'settings.sectionCalendar',
    descriptionKey: 'settings.sectionCalendarHint',
  },
  {
    id: SETTINGS_SECTION.TIMER,
    group: SETTINGS_GROUP.PLANNER,
    icon: 'timer',
    labelKey: 'settings.sectionTimer',
    descriptionKey: 'settings.sectionTimerHint',
  },
  {
    id: SETTINGS_SECTION.BEHAVIOR,
    group: SETTINGS_GROUP.PLANNER,
    icon: 'zap',
    labelKey: 'settings.sectionBehaviour',
    descriptionKey: 'settings.sectionBehaviourHint',
  },
  {
    id: SETTINGS_SECTION.CLIENTS,
    group: SETTINGS_GROUP.PLANNER,
    icon: 'users',
    labelKey: 'settings.sectionClients',
    descriptionKey: 'settings.sectionClientsHint',
  },
  {
    id: SETTINGS_SECTION.FORMAT,
    group: SETTINGS_GROUP.PLANNER,
    icon: 'globe',
    labelKey: 'settings.sectionFormat',
    descriptionKey: 'settings.sectionFormatHint',
  },
  {
    id: SETTINGS_SECTION.DATA,
    group: SETTINGS_GROUP.DATA,
    icon: 'save',
    labelKey: 'settings.sectionData',
    descriptionKey: 'settings.sectionDataHint',
  },
]

export const SETTINGS_GROUP_LABEL_KEYS: Record<SettingsGroup, string> = {
  [SETTINGS_GROUP.APPEARANCE]: 'settings.groupAppearance',
  [SETTINGS_GROUP.PLANNER]: 'settings.groupPlanner',
  [SETTINGS_GROUP.DATA]: 'settings.groupData',
}

export function sectionMeta(id: SettingsSection): SettingsSectionMeta {
  return (
    SETTINGS_SECTIONS.find((section) => section.id === id) ??
    SETTINGS_SECTIONS[0]
  )
}

const isOpen = ref(false)
const activeSection = ref<SettingsSection | null>(null)

export function useSettingsPanel() {
  /** Without a section the panel opens on its menu. */
  function open(section?: SettingsSection) {
    activeSection.value = section ?? null
    isOpen.value = true
  }

  function openSection(section: SettingsSection) {
    activeSection.value = section
  }

  function back() {
    activeSection.value = null
  }

  function close() {
    isOpen.value = false
  }

  function toggle(section?: SettingsSection) {
    if (isOpen.value) {
      close()
      return
    }
    open(section)
  }

  /** Escape steps back out of a section before it closes the panel. */
  function escape() {
    if (activeSection.value !== null) {
      back()
      return
    }
    close()
  }

  return {
    isOpen,
    activeSection,
    open,
    openSection,
    back,
    close,
    toggle,
    escape,
  }
}
