<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Goal } from '../../../entities/GoalEntity'
import type { ID, Priority } from '../../../entities/types'
import type {
  MajorTaskOption,
  TaskSchedule,
} from '../../../entities/TaskEntity'
import TaskComposer from '../../tasks/components/TaskComposer.vue'
import { useSettings } from '../../../composables/useSettings'
import { projectColors } from '../../../composables/theme/goalTheme'
import ProjectPicker, { type PickerOption } from './ProjectPicker.vue'

const props = defineProps<{
  isAllMode: boolean
  goals: Goal[]
  majorTaskOptions: MajorTaskOption[]
}>()

const { settings } = useSettings()
const keyboardShortcuts = computed(() => settings.behavior.keyboardShortcuts)

const emit = defineEmits<{
  (
    e: 'add-task',
    title: string,
    priority: Priority,
    schedule?: TaskSchedule,
  ): void
  (
    e: 'create-all-mode-minor',
    title: string,
    goalId?: ID,
    majorId?: ID,
    schedule?: TaskSchedule,
  ): void
}>()

/**
 * All Tasks target: '' keeps the task unassigned, 'goal:<id>' files it under a
 * goal, 'major:<id>' under a project. Like the old form, the last choice stays
 * after a submit and nothing is required.
 */
const target = ref('')

const colorByGoal = computed(() => projectColors(props.goals))

const targetOptions = computed<PickerOption[]>(() => [
  { value: '', label: 'No project', group: 'none' },
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

function onSubmit(title: string, priority: Priority, schedule?: TaskSchedule) {
  if (!props.isAllMode) {
    emit('add-task', title, priority, schedule)
    return
  }

  const [kind, id] = target.value.split(/:(.*)/)
  if (kind === 'goal') {
    emit('create-all-mode-minor', title, id, undefined, schedule)
    return
  }
  if (kind === 'major') {
    const option = props.majorTaskOptions.find((item) => item.id === id)
    emit('create-all-mode-minor', title, option?.goalId, id, schedule)
    return
  }
  emit('create-all-mode-minor', title, undefined, undefined, schedule)
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
