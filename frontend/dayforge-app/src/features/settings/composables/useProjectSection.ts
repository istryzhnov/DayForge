import { computed, ref, watch } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { GoalStatus } from '../../../entities/types'
import { GOAL_STATUS } from '../../../entities/constants'
import { GOAL_STATUS_HINTS, GOAL_STATUS_OPTIONS } from './settingsOptions'
import { PROJECT_ICONS } from '../../goals/icons/projectIcons'
import { i18n } from '../../../i18n'

type ProjectSectionProps = {
  goal: Goal
}

type ProjectSectionActions = {
  onUpdateDetails: (title: string, description: string) => void
  onUpdateStatus: (status: GoalStatus) => void
  onUpdateIcon: (icon: string | undefined) => void
  onDelete: () => void
}

export function useProjectSection(
  props: ProjectSectionProps,
  actions: ProjectSectionActions,
) {
  const title = ref(props.goal.title)
  const description = ref(props.goal.description ?? '')

  // The panel stays mounted while another project is selected, and a rename
  // from anywhere else has to win over a draft nobody committed.
  watch(
    () => [props.goal.id, props.goal.title, props.goal.description],
    () => {
      title.value = props.goal.title
      description.value = props.goal.description ?? ''
    },
  )

  function commitTitle() {
    const trimmed = title.value.trim()
    if (!trimmed) {
      title.value = props.goal.title
      return
    }
    if (trimmed === props.goal.title) return
    actions.onUpdateDetails(trimmed, description.value)
  }

  function commitDescription() {
    if (description.value.trim() === (props.goal.description ?? '')) return
    actions.onUpdateDetails(props.goal.title, description.value)
  }

  const statusOptions = GOAL_STATUS_OPTIONS
  const status = computed(() => props.goal.status ?? GOAL_STATUS.ACTIVE)
  /** A message key: the component translates it where the hint shows. */
  const statusHint = computed(() => GOAL_STATUS_HINTS[status.value])

  function setStatus(next: GoalStatus) {
    actions.onUpdateStatus(next)
  }

  const iconOptions = PROJECT_ICONS
  const icon = computed(() => props.goal.icon)

  function setIcon(next: string | undefined) {
    if (next === props.goal.icon) return
    actions.onUpdateIcon(next)
  }

  function confirmDelete() {
    const confirmed = window.confirm(
      i18n.global.t('settings.projectDeleteConfirm', {
        title: props.goal.title,
      }),
    )
    if (confirmed) actions.onDelete()
  }

  return {
    title,
    description,
    commitTitle,
    commitDescription,
    statusOptions,
    status,
    statusHint,
    setStatus,
    iconOptions,
    icon,
    setIcon,
    confirmDelete,
  }
}
