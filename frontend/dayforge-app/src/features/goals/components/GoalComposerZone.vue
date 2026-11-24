<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Goal } from '../../../entities/GoalEntity'
import type {
  MajorTaskOption,
  TaskSchedule,
} from '../../../entities/TaskEntity'
import { TaskComposer, useTaskActions } from '../../tasks'
import { useSettings } from '../../../shared/composables/useSettings'
import { projectColors } from '../../../shared/composables/theme/goalTheme'
import ProjectPicker, { type PickerOption } from './ProjectPicker.vue'

const props = defineProps<{
  isAllMode: boolean
  goals: Goal[]
  majorTaskOptions: MajorTaskOption[]
}>()

const { settings } = useSettings()
const { t } = useI18n()
const keyboardShortcuts = computed(() => settings.behavior.keyboardShortcuts)

const actions = useTaskActions()

/**
 * All Tasks target: '' keeps the task unassigned, 'goal:<id>' files it under a
 * goal, 'major:<id>' under a project. Like the old form, the last choice stays
 * after a submit and nothing is required.
 */
const target = ref('')

const colorByGoal = computed(() => projectColors(props.goals))

const targetOptions = computed<PickerOption[]>(() => [
  { value: '', label: t('goals.noProject'), group: 'none' },
  ...props.goals.map((goal) => ({
    value: `goal:${goal.id}`,
    label: goal.title,
    color: colorByGoal.value.get(goal.id),
    group: 'goal' as const,
  })),
  ...props.majorTaskOptions.map((option) => ({
    value: `major:${option.id}`,
    label: option.title,
    hint: option.goalTitle,
    color: option.goalId ? colorByGoal.value.get(option.goalId) : undefined,
    group: 'major' as const,
  })),
])

function onSubmit(title: string, schedule?: TaskSchedule) {
  if (!props.isAllMode) {
    actions.addTask(title, schedule)
    return
  }

  const [kind, id] = target.value.split(/:(.*)/)
  if (kind === 'goal') {
    actions.addInAllMode(title, id, undefined, schedule)
    return
  }
  if (kind === 'major') {
    const option = props.majorTaskOptions.find((item) => item.id === id)
    actions.addInAllMode(title, option?.goalId, id, schedule)
    return
  }
  actions.addInAllMode(title, undefined, undefined, schedule)
}
</script>

<template>
  <TaskComposer :shortcut="isAllMode && keyboardShortcuts" @submit="onSubmit">
    <template v-if="isAllMode" #target>
      <ProjectPicker
        v-model="target"
        :options="targetOptions"
        data-tip-anchor="composer-project"
      />
    </template>
  </TaskComposer>
</template>
