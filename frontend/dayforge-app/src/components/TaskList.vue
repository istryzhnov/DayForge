<script setup lang="ts">
import type { ID, Priority } from '../entities/types'
import type { DailyTask } from '../entities/TaskEntity'
import { ref } from 'vue'
import TaskComposer from './TaskComposer.vue'

type FlatNode = {
  task: DailyTask
  depth: number
  goalTitle: string
}

defineProps<{
  nodes: FlatNode[]
  isAllMode: boolean
}>()

const emit = defineEmits<{
  (e: 'add-subtask', parentId: ID, title: string, priority: Priority): void
}>()

const activeParentId = ref<ID | null>(null)

function handleSubtaskSubmit(parentId: ID, title: string, priority: Priority) {
  emit('add-subtask', parentId, title, priority)
  activeParentId.value = null
}
</script>

<template>
  <div v-if="nodes.length" class="task-list">
    <template v-for="node in nodes" :key="node.task.id" class="task-list">
      <div class="task-row" :style="`padding-left: ${16 + node.depth * 22}px`">
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
            @click="
              activeParentId =
                activeParentId === node.task.id ? null : node.task.id
            "
          >
            + subtask
          </button>
        </div>
      </div>

      <TaskComposer
        v-if="activeParentId === node.task.id"
        :is-subtask="true"
        :is-all-mode="false"
        @submit="
          (title, priority) =>
            handleSubtaskSubmit(node.task.templateId, title, priority)
        "
        @cancel="activeParentId = null"
      />
    </template>
  </div>

  <p v-else class="task-empty">No tasks yet</p>
</template>
