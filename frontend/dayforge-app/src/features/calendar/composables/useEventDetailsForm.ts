import { computed, ref, watch } from 'vue'
import type { DailyTask, MajorTaskOption } from '../../../entities/TaskEntity'
import type { ID } from '../../../entities/types'
import { PRIORITY } from '../../../entities/constants'

type DetailsProps = {
  task: DailyTask
  projectOptions: MajorTaskOption[]
  currentProjectId: ID | null
  currentGoalId: ID | null
}

type DetailsActions = {
  onUpdateTitle: (payload: { templateId: ID; title: string }) => void
  onUpdateGoal: (payload: { templateId: ID; goalId: ID | undefined }) => void
  onUpdateProject: (payload: {
    templateId: ID
    projectTemplateId: ID | null
  }) => void
  onUpdateTime: (payload: {
    taskId: ID
    startTime: string
    endTime: string
  }) => void
}

export function useEventDetailsForm(
  props: DetailsProps,
  actions: DetailsActions,
) {
  const title = ref(props.task.title)
  const startTime = ref(props.task.startTime ?? '')
  const endTime = ref(props.task.endTime ?? '')
  const goalId = ref<ID | ''>(props.currentGoalId ?? '')
  const projectId = ref<ID | ''>(props.currentProjectId ?? '')

  // A project groups other tasks, so it cannot itself be nested.
  const canAttachToProject = computed(
    () => props.task.priority !== PRIORITY.MAJOR,
  )

  const projectsForGoal = computed(() => {
    const selectedGoalId = goalId.value || undefined
    return props.projectOptions.filter(
      (option) => option.goalId === selectedGoalId,
    )
  })

  const isTimeValid = computed(
    () =>
      Boolean(startTime.value) &&
      Boolean(endTime.value) &&
      startTime.value < endTime.value,
  )

  watch(
    () => props.task,
    (task) => {
      title.value = task.title
      startTime.value = task.startTime ?? ''
      endTime.value = task.endTime ?? ''
      goalId.value = props.currentGoalId ?? ''
      projectId.value = props.currentProjectId ?? ''
    },
  )

  watch(goalId, () => {
    if (
      projectId.value &&
      !projectsForGoal.value.some((option) => option.id === projectId.value)
    ) {
      projectId.value = ''
    }
  })

  function save() {
    const templateId = props.task.templateId
    const trimmed = title.value.trim()

    if (trimmed && trimmed !== props.task.title) {
      actions.onUpdateTitle({ templateId, title: trimmed })
    }

    if ((goalId.value || '') !== (props.currentGoalId ?? '')) {
      actions.onUpdateGoal({ templateId, goalId: goalId.value || undefined })
    }

    if (
      canAttachToProject.value &&
      (projectId.value || '') !== (props.currentProjectId ?? '')
    ) {
      actions.onUpdateProject({
        templateId,
        projectTemplateId: projectId.value || null,
      })
    }

    if (!isTimeValid.value) return
    actions.onUpdateTime({
      taskId: props.task.id,
      startTime: startTime.value,
      endTime: endTime.value,
    })
  }

  return {
    title,
    startTime,
    endTime,
    goalId,
    projectId,
    canAttachToProject,
    projectsForGoal,
    isTimeValid,
    save,
  }
}
