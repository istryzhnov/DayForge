<script setup lang="ts">
import { useTemplateRef } from 'vue'
import type { Priority } from '../../../entities/types'
import type { TaskSchedule } from '../../../entities/TaskEntity'
import { useTaskComposerState } from '../composables/useTaskComposerState'
import TaskScheduleFields from './TaskScheduleFields.vue'

const props = defineProps<{
  isAllMode: boolean
  isSubtask?: boolean
}>()

const emit = defineEmits<{
  (e: 'submit', title: string, priority: Priority, schedule?: TaskSchedule): void
  (e: 'cancel'): void
}>()

// Only subtasks are schedulable: a major task is an umbrella resolved once its
// minors are done, not something performed at a given time.
const scheduleFields = useTemplateRef<InstanceType<typeof TaskScheduleFields>>(
  'scheduleFields',
)

const { title, submit, cancel } = useTaskComposerState(
  {
    isSubtask: Boolean(props.isSubtask),
    isAllMode: props.isAllMode,
    readSchedule: () => scheduleFields.value?.buildSchedule(),
    canSubmitSchedule: () => scheduleFields.value?.isValid ?? true,
    onScheduleSubmitted: () => scheduleFields.value?.reset(),
  },
  {
    onSubmit: (nextTitle, nextPriority, nextSchedule) =>
      emit('submit', nextTitle, nextPriority, nextSchedule),
    onCancel: () => emit('cancel'),
  },
)
</script>

<template>
  <p v-if="isAllMode" class="goal-hint">
    Select a specific goal in the sidebar to add a new top-level task.
  </p>

  <template v-else>
    <div class="goal-form-card" :class="{ 'goal-form-sub': isSubtask }">
      <input
        v-model="title"
        type="text"
        placeholder="New major task title "
        @keydown.enter="submit"
      />
      <button class="btn btn-primary" @click="submit">
        {{ isSubtask ? 'Add Subtask' : 'Add Task' }}
      </button>
      <button v-if="isSubtask" class="btn btn-ghost" @click="cancel">
        Cancel
      </button>
    </div>

    <TaskScheduleFields v-if="isSubtask" ref="scheduleFields" />
  </template>
</template>
