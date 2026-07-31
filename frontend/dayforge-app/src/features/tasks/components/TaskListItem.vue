<script setup lang="ts">
import type { ID, Priority } from '../../../entities/types'
import type { MajorDecision } from '../../../entities/TaskEntity'
import type { FlatTaskNode } from '../../../composables/useTaskTree'
import TaskComposer from './TaskComposer.vue'

defineProps<{
  node: FlatTaskNode
  isAllMode: boolean
  isActiveParent: boolean
  isMinorDone: boolean
  onToggleMinor: (taskId: ID) => void
  onResolveMajor: (taskId: ID, decision: MajorDecision) => void
  onToggleParent: (taskId: ID) => void
  onSubmitSubtask: (
    parentTemplateId: ID,
    title: string,
    priority: Priority,
  ) => void
  onCancelSubtask: () => void
  onFocusMajor: (dailyMajorTaskId: ID) => void
}>()
</script>

<template>
  <div class="task-row" :style="`padding-left: ${14 + node.depth * 16}px`">
    <div class="task-main">
      <span class="dot" :class="node.task.priority"></span>

      <label v-if="node.task.priority === 'minor'" class="task-check-wrap">
        <input
          class="task-check"
          type="checkbox"
          :checked="node.task.status === 'done'"
          @change="onToggleMinor(node.task.id)"
        />
        <span class="task-check-indicator"></span>
      </label>

      <div class="task-copy">
        <span
          class="task-title"
          :class="{ 'task-done': node.task.status === 'done' }"
        >
          {{ node.task.title }}
        </span>

        <div class="task-meta">
          <span v-if="isAllMode" class="goal-inline-chip">
            {{ node.goalTitle }}
          </span>

          <span
            v-if="node.task.priority === 'major'"
            class="task-priority-chip"
          >
            {{ node.minorDone }} / {{ node.minorTotal }} done
          </span>

          <span
            v-if="node.task.priority === 'minor' && node.majorTitle"
            class="major-inline-chip"
          >
            {{ node.majorTitle }}
          </span>
        </div>
      </div>
    </div>

    <div class="actions">
      <template v-if="node.task.priority === 'major' && node.canResolveMajor">
        <button
          class="btn btn-ghost"
          @click="onResolveMajor(node.task.id, 'continue')"
        >
          Continue work
        </button>
        <button
          class="btn btn-primary"
          @click="onResolveMajor(node.task.id, 'done')"
        >
          Close space
        </button>
        <button
          v-if="node.task.priority === 'major'"
          class="btn btn-ghost"
          @click="onFocusMajor(node.task.id)"
        >
          Habit
        </button>
      </template>
      <button class="btn btn-ghost" @click="onToggleParent(node.task.id)">
        + subtask
      </button>
    </div>
  </div>

  <TaskComposer
    v-if="isActiveParent"
    :is-subtask="true"
    :is-all-mode="false"
    @submit="
      (title: string, priority: Priority) =>
        onSubmitSubtask(node.task.templateId, title, priority)
    "
    @cancel="onCancelSubtask"
  />
</template>
