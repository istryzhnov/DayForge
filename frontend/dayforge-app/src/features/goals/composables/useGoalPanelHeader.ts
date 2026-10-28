import { computed } from 'vue'
import { GOAL_STATUS } from '../../../entities/constants'
import { i18n } from '../../../i18n'
import {
  SETTINGS_SECTION,
  useSettingsPanel,
} from '../../settings/composables/useSettingsPanel'

type GoalPanelHeaderProps = {
  /** A goal status, or "overview" in All Projects mode. */
  status: string
}

/** Message keys for the badges, rendered when the header is shown. */
const STATUS_BADGE_KEYS: Record<string, string> = {
  [GOAL_STATUS.PAUSED]: 'goals.statusPaused',
  [GOAL_STATUS.ARCHIVED]: 'goals.statusArchived',
}

export function useGoalPanelHeader(props: GoalPanelHeaderProps) {
  const { isOpen, activeSection, open, close } = useSettingsPanel()

  /** Only a status that changes what the app does is worth a badge. */
  const statusBadge = computed<string | null>(() => {
    const key = STATUS_BADGE_KEYS[props.status]
    return key ? i18n.global.t(key) : null
  })

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
