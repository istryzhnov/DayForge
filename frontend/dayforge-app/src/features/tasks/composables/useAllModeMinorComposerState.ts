import { computed, ref, watch } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { ID } from '../../../entities/types'
import type { MajorTaskOption } from '../../../entities/TaskEntity'

type Props = {
  goals: Goal[]
  majorTaskOptions: MajorTaskOption[]
}

type Actions = {
  onCreateMinor: (title: string, goalId?: ID, majorTemplateId?: ID) => void
}

export function useAllModeMinorComposerState(props: Props, actions: Actions) {
  const selectedGoalId = ref<ID | ''>('')
  const selectedMajorId = ref<ID | ''>('')
  const minorTitle = ref('')

  const filteredMajorTaskOptions = computed(() => {
    if (!selectedGoalId.value) return props.majorTaskOptions

    return props.majorTaskOptions.filter(
      (option) => option.goalId === selectedGoalId.value,
    )
  })

  watch(selectedGoalId, () => {
    if (!selectedMajorId.value) return

    const majorExists = filteredMajorTaskOptions.value.some(
      (option) => option.id === selectedMajorId.value,
    )

    if (!majorExists) {
      selectedMajorId.value = ''
    }
  })

  function submitMinor() {
    const title = minorTitle.value.trim()
    if (!title) return

    actions.onCreateMinor(
      title,
      selectedGoalId.value || undefined,
      selectedMajorId.value || undefined,
    )
    minorTitle.value = ''
  }

  return {
    selectedGoalId,
    selectedMajorId,
    minorTitle,
    filteredMajorTaskOptions,
    submitMinor,
  }
}
