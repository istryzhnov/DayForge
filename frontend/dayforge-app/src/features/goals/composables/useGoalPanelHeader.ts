import { computed } from 'vue'
import { GOAL_STATUS } from '../../../entities/constants'
import {
  SETTINGS_SECTION,
  useSettingsPanel,
} from '../../settings/composables/useSettingsPanel'

type GoalPanelHeaderProps = {
  /** A goal status, or "overview" in All Projects mode. */
  status: string
}

const STATUS_BADGES: Record<string, string> = {
  [GOAL_STATUS.PAUSED]: 'Paused',
  [GOAL_STATUS.ARCHIVED]: 'Archived',
}

export function useGoalPanelHeader(props: GoalPanelHeaderProps) {
  const { isOpen, activeSection, open, close } = useSettingsPanel()

  /** Only a status that changes what the app does is worth a badge. */
  const statusBadge = computed<string | null>(
    () => STATUS_BADGES[props.status] ?? null,
  )

  const isProjectSettingsOpen = computed(
    () => isOpen.value && activeSection.value === SETTINGS_SECTION.PROJECT,
  )

  /** A second press on the same button closes what the first one opened. */
  function toggleProjectSettings() {
    if (isProjectSettingsOpen.value) close()
    else open(SETTINGS_SECTION.PROJECT)
  }

  return { statusBadge, isProjectSettingsOpen, toggleProjectSettings }
}
