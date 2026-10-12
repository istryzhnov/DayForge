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
  const { open: openSettings } = useSettingsPanel()

  /** Only a status that changes what the app does is worth a badge. */
  const statusBadge = computed<string | null>(
    () => STATUS_BADGES[props.status] ?? null,
  )

  function openProjectSettings() {
    openSettings(SETTINGS_SECTION.PROJECT)
  }

  return { statusBadge, openProjectSettings }
}
