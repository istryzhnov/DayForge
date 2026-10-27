<script setup lang="ts">
import { ref, useId, useTemplateRef } from 'vue'
import AppIcon from '../../../components/AppIcon.vue'
import type { Priority } from '../../../entities/types'
import type { TaskSchedule } from '../../../entities/TaskEntity'
import { useTaskComposerState } from '../composables/useTaskComposerState'
import TaskScheduleFields from './TaskScheduleFields.vue'

const props = defineProps<{
  isAllMode: boolean
  isSubtask?: boolean
}>()

const emit = defineEmits<{
  (
    e: 'submit',
    title: string,
    priority: Priority,
    schedule?: TaskSchedule,
  ): void
  (e: 'cancel'): void
}>()

const inputId = useId()
// The calendar button is the only switch for scheduling in this row.
const calendarOn = ref(false)

const scheduleFields =
  useTemplateRef<InstanceType<typeof TaskScheduleFields>>('scheduleFields')

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

  <div v-else class="task-composer">
    <div class="ui-card task-composer__row">
      <AppIcon name="plus" :size="16" class="task-composer__plus" />

      <label :for="inputId" class="task-composer__label">Add a task</label>
      <input
        :id="inputId"
        v-model="title"
        class="task-composer__input"
        type="text"
        placeholder="Add a task"
        @keydown.enter="submit"
      />

      <button
        type="button"
        class="ui-icon-btn ui-icon-btn--outlined task-composer__calendar"
        :class="{ 'is-active': calendarOn }"
        :aria-pressed="calendarOn"
        aria-label="Schedule on the calendar"
        title="Schedule on the calendar"
        @click="calendarOn = !calendarOn"
      >
        <AppIcon name="calendar" :size="16" />
      </button>

      <button
        v-if="isSubtask"
        type="button"
        class="task-composer__cancel"
        @click="cancel"
      >
        Cancel
      </button>
      <button type="button" class="task-composer__add" @click="submit">
        Add
      </button>
    </div>

    <TaskScheduleFields
      ref="scheduleFields"
      v-model:enabled="calendarOn"
      hide-toggle
    />
  </div>
</template>
