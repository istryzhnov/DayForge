<script setup lang="ts">
import type { ID, Priority } from '../entities/types'
import type { DailyTask, MajorDecision } from '../entities/TaskEntity'
import { ref } from 'vue'
import TaskComposer from './TaskComposer.vue'

type FlatNode = {
  task: DailyTask
  depth: number
  goalTitle: string
  minorDone: number
  minorTotal: number
  canResolveMajor: boolean
  majorResolved: boolean
}

defineProps<{
  nodes: FlatNode[]
  isAllMode: boolean
}>()

const emit = defineEmits<{
  (e: 'add-subtask', parentId: ID, title: string, priority: Priority): void
  (e: 'toggle-minor', dailyTaskId: ID): void
  (e: 'resolve-major', dailyMajorTaskId: ID, decision: MajorDecision): void
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

          <input
            v-if="node.task.priority === 'minor'"
            type="checkbox"
            :checked="node.task.status === 'done'"
            @change="emit('toggle-minor', node.task.id)"
          />

          <span :class="{ 'task-done': node.task.status === 'done' }">
            {{ node.task.title }}
          </span>

          <span v-if="isAllMode" class="goal-inline-chip">
            {{ node.goalTitle }}
          </span>

          <span
            v-if="node.task.priority === 'major'"
            class="task-priority-chip"
          >
            {{ node.minorDone }} / {{ node.minorTotal }} minor done
          </span>
        </div>

        <div class="actions">
          <template
            v-if="node.task.priority === 'major' && node.canResolveMajor"
          >
            <button
              class="btn btn-ghost"
              @click="emit('resolve-major', node.task.id, 'continue')"
            >
              Continue work
            </button>
            <button
              class="btn btn-primary"
              @click="emit('resolve-major', node.task.id, 'done')"
            >
              Close space
            </button>
          </template>
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
