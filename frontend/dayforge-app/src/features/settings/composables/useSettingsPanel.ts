import { ref } from 'vue'

export const SETTINGS_SECTION = {
  THEME: 'theme',
  COLORS: 'colors',
  PROJECT: 'project',
  WORKSPACE: 'workspace',
  PLANNER: 'planner',
  DATA: 'data',
} as const

export type SettingsSection =
  (typeof SETTINGS_SECTION)[keyof typeof SETTINGS_SECTION]

// Module-level so the ⚙ in the left sidebar and the "More colours" entry on a
// project both drive the one panel — the same singleton pattern as
// `useUndoToast`.
const isOpen = ref(false)
const activeSection = ref<SettingsSection>(SETTINGS_SECTION.THEME)

export function useSettingsPanel() {
  function open(section?: SettingsSection) {
    if (section) activeSection.value = section
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  function toggle(section?: SettingsSection) {
    if (isOpen.value && (!section || section === activeSection.value)) {
      close()
      return
    }
    open(section)
  }

  return { isOpen, activeSection, open, close, toggle }
}
