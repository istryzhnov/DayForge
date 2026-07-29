<script setup lang="ts">
import type { Priority } from '../../../entities/types'
import { useTaskComposerState } from '../composables/useTaskComposerState'

const props = defineProps<{
  isAllMode: boolean
  isSubtask?: boolean
}>()

const emit = defineEmits<{
  (e: 'submit', title: string, priority: Priority): void
  (e: 'cancel'): void
}>()

const { title, submit, cancel } = useTaskComposerState(
  {
    isSubtask: Boolean(props.isSubtask),
    isAllMode: props.isAllMode,
  },
  {
    onSubmit: (nextTitle, nextPriority) =>
      emit('submit', nextTitle, nextPriority),
    onCancel: () => emit('cancel'),
  },
)
</script>

<template>
  <p v-if="isAllMode" class="goal-hint">
    Select a specific goal in the sidebar to add a new top-level task.
  </p>

  <div v-else class="goal-form-card" :class="{ 'goal-form-sub': isSubtask }">
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
</template>
