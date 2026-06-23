<script setup lang="ts">
import type { ID } from '../entities/types'
import type { TaskTemplate } from '../entities/TaskEntity'

type FlatNode = {
  task: TaskTemplate
  depth: number
  goalTitle: string
}

defineProps<{
  nodes: FlatNode[]
  isAllMode: boolean
}>()

const emit = defineEmits<{
  (e: 'open-subtask', parentId: ID): void
}>()
</script>

<template>
  <div v-if="nodes.length" class="task-list">
    <div
      v-for="node in nodes"
      :key="node.task.id"
      class="task-row"
      :style="{ paddingLeft: `${16 + node.depth * 22}px` }"
    >
      <div class="left">
        <span class="dot" :class="node.task.priority"></span>
        <span>{{ node.task.title }}</span>
        <span v-if="isAllMode" class="goal-inline-chip">{{
          node.goalTitle
        }}</span>
      </div>

      <div class="actions">
        <button
          class="btn btn-ghost"
          @click="emit('open-subtask', node.task.id)"
        >
          + subtask
        </button>
      </div>
    </div>
  </div>

  <p v-else class="task-empty">No tasks yet</p>
</template>
