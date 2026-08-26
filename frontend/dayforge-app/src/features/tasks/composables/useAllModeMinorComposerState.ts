import { computed, ref, watch } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { ID } from '../../../entities/types'
import type {
  MajorTaskOption,
  TaskSchedule,
} from '../../../entities/TaskEntity'

type Props = {
  goals: Goal[]
  majorTaskOptions: MajorTaskOption[]
}

type Actions = {
  onCreateMinor: (
    title: string,
    goalId?: ID,
    majorTemplateId?: ID,
    schedule?: TaskSchedule,
  ) => void
}

type Options = {
  readSchedule?: () => TaskSchedule | undefined
  canSubmitSchedule?: () => boolean
  onScheduleSubmitted?: () => void
}

export function useAllModeMinorComposerState(
  props: Props,
  actions: Actions,
  options: Options = {},
) {
  const isAssignEnabled = ref(false)
  const selectedGoalId = ref<ID | ''>('')
  const selectedMajorId = ref<ID | ''>('')
  const minorTitle = ref('')

  watch(isAssignEnabled, (enabled) => {
    if (enabled) return
    selectedGoalId.value = ''
    selectedMajorId.value = ''
  })

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
    if (options.canSubmitSchedule && !options.canSubmitSchedule()) return

    actions.onCreateMinor(
      title,
      selectedGoalId.value || undefined,
      selectedMajorId.value || undefined,
      options.readSchedule?.(),
    )
    minorTitle.value = ''
    options.onScheduleSubmitted?.()
  }

  return {
    isAssignEnabled,
    selectedGoalId,
    selectedMajorId,
    minorTitle,
    filteredMajorTaskOptions,
    submitMinor,
  }
}
