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
import AppIcon from '../../../components/AppIcon.vue'

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

/** Colour of the chosen target's goal, for the dot beside the picker. */
const targetColor = computed(() => {
  const [kind, id] = target.value.split(/:(.*)/)
  if (kind === 'goal') return colorByGoal.value.get(id)
  if (kind === 'major') {
    const option = props.majorTaskOptions.find((item) => item.id === id)
    return option?.goalId ? colorByGoal.value.get(option.goalId) : undefined
  }
  return undefined
})

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
      <div class="task-composer__target">
        <span
          class="task-composer__target-dot"
          :style="targetColor ? { background: targetColor } : undefined"
          aria-hidden="true"
        />
        <select v-model="target" class="task-composer__select" aria-label="Project">
          <option value="">Only in All Tasks</option>
          <optgroup label="Goal">
            <option v-for="goal in goals" :key="goal.id" :value="`goal:${goal.id}`">
              {{ goal.title }}
            </option>
          </optgroup>
          <optgroup label="Project">
            <option
              v-for="option in majorTaskOptions"
              :key="option.id"
              :value="`major:${option.id}`"
            >
              {{ option.title }} ({{ option.goalTitle }})
            </option>
          </optgroup>
        </select>
        <AppIcon name="chevron-right" :size="12" class="task-composer__target-caret" />
      </div>
    </template>
  </TaskComposer>
</template>
