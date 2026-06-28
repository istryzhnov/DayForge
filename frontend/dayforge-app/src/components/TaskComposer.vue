<script setup lang="ts">
import { ref } from 'vue'
import type { ID, Priority } from '../entities/types'

const props = defineProps<{
  isAllMode: boolean
  isSubtask?: boolean
}>()

const emit = defineEmits<{
  (e: 'submit', title: string, priority: Priority): void
  (e: 'cancel'): void
}>()

const title = ref('')
const priority = ref<Priority>(props.isSubtask ? 'minor' : 'major')

function submit() {
  if (props.isAllMode) return
  const t = title.value.trim()
  if (!t) return
  emit('submit', t, priority.value)
  title.value = ''
  priority.value = props.isSubtask ? 'minor' : 'major'
}
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
    <button v-if="isSubtask" class="btn btn-ghost" @click="$emit('cancel')">
      Cancel
    </button>
  </div>
</template>
