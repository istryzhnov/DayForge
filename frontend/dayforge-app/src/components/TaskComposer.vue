<script setup lang="ts">
import { ref } from 'vue'
import type { ID, Priority } from '../entities/types'

const props = defineProps<{
  isAllMode: boolean
}>()

const emit = defineEmits<{
  (e: 'add-task', title: string, priority: Priority): void
  (
    e: 'add-subtask',
    parentTemplateId: ID,
    title: string,
    priority: Priority,
  ): void
}>()

const newTaskTitle = ref('')
const newTaskPriority = ref<Priority>('major')

const subTaskParentId = ref<ID | null>(null)
const newSubtaskTitle = ref('')
const newSubtaskPriority = ref<Priority>('minor')

function submitTask() {
  if (props.isAllMode) return

  const title = newTaskTitle.value.trim()
  if (!title) return

  emit('add-task', title, newTaskPriority.value)
  newTaskTitle.value = ''
  newTaskPriority.value = 'minor'
}

function openSubtask(parentId: ID) {
  subTaskParentId.value = parentId
  newSubtaskTitle.value = ''
  newSubtaskPriority.value = 'minor'
}

function submitSubtask() {
  if (!subTaskParentId.value) return

  const title = newSubtaskTitle.value.trim()
  if (!title) return

  emit('add-subtask', subTaskParentId.value, title, newSubtaskPriority.value)
  subTaskParentId.value = null
  newSubtaskTitle.value = ''
  newSubtaskPriority.value = 'minor'
}

defineExpose({
  openSubtask,
})
</script>

<template>
  <p v-if="isAllMode" class="goal-hint">
    Select a specific goal in the sidebar to add a new top-level task.
  </p>

  <div v-else class="goal-form-card">
    <input
      v-model="newTaskTitle"
      type="text"
      placeholder="New task title"
      @keydown.enter="submitTask"
    />
    <button class="btn btn-primary" @click="submitTask">Add Task</button>
  </div>

  <div v-if="subTaskParentId" class="goal-form-card goal-form-sub">
    <input
      v-model="newSubtaskTitle"
      type="text"
      placeholder="New subtask title"
      @keydown.enter="submitSubtask"
    />
    <button class="btn btn-primary" @click="submitSubtask">Add Subtask</button>
    <button class="btn btn-ghost" @click="subTaskParentId = null">
      Cancel
    </button>
  </div>
</template>
