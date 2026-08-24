import { ref } from 'vue'

/**
 * Navigation for the settings column.
 *
 * The panel is a menu that drills into one section at a time rather than a row
 * of tabs: a 320px column fits maybe four chips, and the list of things a user
 * can configure only ever grows. A list of labelled rows takes new entries
 * without redesigning anything, and each row can show its current value, so the
 * menu itself answers most questions without being opened.
 *
 * `activeSection === null` means the menu itself is on screen.
 */

export const SETTINGS_SECTION = {
  THEME: 'theme',
  COLORS: 'colors',
  PROJECT: 'project',
  WORKSPACE: 'workspace',
  REMINDERS: 'reminders',
  CALENDAR: 'calendar',
  BEHAVIOR: 'behavior',
  FORMAT: 'format',
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
  icon: string
  label: string
  /** Shown under the title once the section is open. */
  description: string
}

export const SETTINGS_SECTIONS: SettingsSectionMeta[] = [
  {
    id: SETTINGS_SECTION.THEME,
    group: SETTINGS_GROUP.APPEARANCE,
    icon: '🎨',
    label: 'Theme',
    description: 'Ready-made looks, light or dark.',
  },
  {
    id: SETTINGS_SECTION.COLORS,
    group: SETTINGS_GROUP.APPEARANCE,
    icon: '🎯',
    label: 'Colours',
    description: 'Every colour in the interface, with suggested companions.',
  },
  {
    id: SETTINGS_SECTION.PROJECT,
    group: SETTINGS_GROUP.APPEARANCE,
    icon: '🏷️',
    label: 'This project',
    description: 'Colours for the open project only.',
  },
  {
    id: SETTINGS_SECTION.WORKSPACE,
    group: SETTINGS_GROUP.APPEARANCE,
    icon: '📐',
    label: 'Workspace',
    description: 'Shape, spacing, typeface and reading comfort.',
  },
  {
    id: SETTINGS_SECTION.REMINDERS,
    group: SETTINGS_GROUP.PLANNER,
    icon: '🔔',
    label: 'Reminders',
    description: 'When and how a task announces itself.',
  },
  {
    id: SETTINGS_SECTION.CALENDAR,
    group: SETTINGS_GROUP.PLANNER,
    icon: '📅',
    label: 'Calendar',
    description: 'How the grid behaves and what a full day means.',
  },
  {
    id: SETTINGS_SECTION.BEHAVIOR,
    group: SETTINGS_GROUP.PLANNER,
    icon: '⚡',
    label: 'Behaviour',
    description: 'What the app does on its own.',
  },
  {
    id: SETTINGS_SECTION.FORMAT,
    group: SETTINGS_GROUP.PLANNER,
    icon: '🌍',
    label: 'Dates and times',
    description: 'How dates and times are written.',
  },
  {
    id: SETTINGS_SECTION.DATA,
    group: SETTINGS_GROUP.DATA,
    icon: '💾',
    label: 'Backup and data',
    description: 'Everything you have, in and out of a file.',
  },
]

export const SETTINGS_GROUP_LABELS: Record<SettingsGroup, string> = {
  [SETTINGS_GROUP.APPEARANCE]: 'Appearance',
  [SETTINGS_GROUP.PLANNER]: 'Planner',
  [SETTINGS_GROUP.DATA]: 'Your data',
}

export function sectionMeta(id: SettingsSection): SettingsSectionMeta {
  return (
    SETTINGS_SECTIONS.find((section) => section.id === id) ??
    SETTINGS_SECTIONS[0]
  )
}

// Module-level so the ⚙ in the left sidebar and the "More colours" entry on a
// project both drive the one panel — the same singleton pattern as
// `useUndoToast`.
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
