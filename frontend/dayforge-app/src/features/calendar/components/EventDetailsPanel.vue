<script setup lang="ts">
import { ref, watch } from 'vue'
import type { DailyTask } from '../../../entities/TaskEntity'
import type { ID } from '../../../entities/types'

const props = defineProps<{
  task: DailyTask
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'unschedule', taskId: ID): void
  (
    e: 'update-time',
    payload: { taskId: ID; startTime: string; endTime: string },
  ): void
}>()

const startTime = ref(props.task.startTime ?? '')
const endTime = ref(props.task.endTime ?? '')

watch(
  () => props.task,
  (task) => {
    startTime.value = task.startTime ?? ''
    endTime.value = task.endTime ?? ''
  },
)

function save() {
  if (!startTime.value || !endTime.value || startTime.value >= endTime.value)
    return
  emit('update-time', {
    taskId: props.task.id,
    startTime: startTime.value,
    endTime: endTime.value,
  })
}
</script>

<template>
  <div class="event-details-overlay" @click.self="emit('close')">
    <div class="event-details">
      <header class="event-details__head">
        <span class="dot" :class="task.priority"></span>
        <strong>{{ task.title }}</strong>
        <button
          class="event-details__close"
          type="button"
          @click="emit('close')"
        >
          ×
        </button>
      </header>

      <div class="event-details__time">
        <label>
          Start
          <input v-model="startTime" type="time" />
        </label>
        <label>
          End
          <input v-model="endTime" type="time" />
        </label>
      </div>

      <div class="event-details__actions">
        <button class="btn btn-primary" type="button" @click="save">
          Save
        </button>
        <button
          class="btn btn-ghost"
          type="button"
          @click="emit('unschedule', task.id)"
        >
          Unschedule
        </button>
      </div>
    </div>
  </div>
</template>
