import { ref } from 'vue'

export const APPEARANCE_SECTION = {
  PRESETS: 'presets',
  COLORS: 'colors',
  WORKSPACE: 'workspace',
  PROJECT: 'project',
} as const

export type AppearanceSection =
  (typeof APPEARANCE_SECTION)[keyof typeof APPEARANCE_SECTION]

// Module-level so the gear in the left sidebar and the "More colours" entry on
// a project both drive the one panel — the same singleton pattern as
// `useUndoToast`.
const isOpen = ref(false)
const activeSection = ref<AppearanceSection>(APPEARANCE_SECTION.PRESETS)

export function useAppearancePanel() {
  function open(section?: AppearanceSection) {
    if (section) activeSection.value = section
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  function toggle(section?: AppearanceSection) {
    if (isOpen.value && (!section || section === activeSection.value)) {
      close()
      return
    }
    open(section)
  }

  return { isOpen, activeSection, open, close, toggle }
}
