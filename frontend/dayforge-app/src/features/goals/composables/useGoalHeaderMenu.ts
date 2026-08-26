import { ref } from 'vue'
import { GOAL_COLOR_PRESETS } from '../../../entities/constants'
import {
  SETTINGS_SECTION,
  useSettingsPanel,
} from '../../settings/composables/useSettingsPanel'

type GoalHeaderProps = {
  title: string
}

type GoalHeaderActions = {
  onChangeColor: (color: string | undefined) => void
  onDeleteGoal: () => void
}

export function useGoalHeaderMenu(
  props: GoalHeaderProps,
  actions: GoalHeaderActions,
) {
  // Widened from the readonly literal tuple for template binding.
  const colorPresets: string[] = [...GOAL_COLOR_PRESETS]
  const { open: openSettings } = useSettingsPanel()
  const showMenu = ref(false)

  function toggleMenu() {
    showMenu.value = !showMenu.value
  }

  function closeMenu() {
    showMenu.value = false
  }

  function pickColor(color: string) {
    actions.onChangeColor(color)
    closeMenu()
  }

  function resetColor() {
    actions.onChangeColor(undefined)
    closeMenu()
  }

  function openProjectAppearance() {
    closeMenu()
    openSettings(SETTINGS_SECTION.PROJECT)
  }

  function confirmDelete() {
    closeMenu()
    if (
      window.confirm(`Delete goal "${props.title}"? This cannot be undone.`)
    ) {
      actions.onDeleteGoal()
    }
  }

  return {
    colorPresets,
    showMenu,
    toggleMenu,
    closeMenu,
    pickColor,
    resetColor,
    openProjectAppearance,
    confirmDelete,
  }
}
