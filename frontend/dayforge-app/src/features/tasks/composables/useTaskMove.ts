import { computed, ref } from 'vue'
import type { MajorTaskOption, TaskTemplate } from '../../../entities/TaskEntity'
import type { ID } from '../../../entities/types'
import { PRIORITY } from '../../../entities/constants'

type MoveProps = {
  template: TaskTemplate
  projectOptions: MajorTaskOption[]
}

type MoveActions = {
  onAssignGoal: (templateId: ID, goalId: ID | undefined) => void
  onAttachToProject: (templateId: ID, projectTemplateId: ID | null) => void
}

export function useTaskMove(props: MoveProps, actions: MoveActions) {
  const goalId = ref<ID | ''>(props.template.goalId ?? '')
  const projectId = ref<ID | ''>(props.template.parentTemplateId ?? '')

  // A project groups other tasks, so it cannot itself be nested.
  const canAttachToProject = computed(
    () => props.template.priority !== PRIORITY.MAJOR,
  )

  const projectsForGoal = computed(() => {
    const selectedGoalId = goalId.value || undefined
    return props.projectOptions.filter(
      (option) =>
        option.goalId === selectedGoalId && option.id !== props.template.id,
    )
  })

  /** A project only groups tasks of its own goal, so the pick can go stale. */
  function syncProjectToGoal() {
    if (!projectId.value) return
    const stillThere = projectsForGoal.value.some(
      (option) => option.id === projectId.value,
    )
    if (!stillThere) projectId.value = ''
  }

  function save() {
    const templateId = props.template.id

    if ((goalId.value || '') !== (props.template.goalId ?? '')) {
      actions.onAssignGoal(templateId, goalId.value || undefined)
    }

    if (
      canAttachToProject.value &&
      (projectId.value || '') !== (props.template.parentTemplateId ?? '')
    ) {
      actions.onAttachToProject(templateId, projectId.value || null)
    }
  }

  return {
    goalId,
    projectId,
    canAttachToProject,
    projectsForGoal,
    syncProjectToGoal,
    save,
  }
}
