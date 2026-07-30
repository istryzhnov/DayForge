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
  <div class="task-row" :style="`padding-left: ${16 + node.depth * 22}px`">
    <div class="left">
      <span class="dot" :class="node.task.priority"></span>

      <input
        v-if="node.task.priority === 'minor'"
        type="checkbox"
        :checked="node.task.status === 'done'"
        @change="onToggleMinor(node.task.id)"
      />

      <span :class="{ 'task-done': node.task.status === 'done' }">
        {{ node.task.title }}
      </span>

      <span v-if="isAllMode" class="goal-inline-chip">
        {{ node.goalTitle }}
      </span>

      <span v-if="node.task.priority === 'major'" class="task-priority-chip">
        {{ node.minorDone }} / {{ node.minorTotal }} minor done
      </span>
      <span
        v-if="node.task.priority === 'minor' && node.majorTitle"
        class="major-inline-chip"
      >
        {{ node.majorTitle }}
      </span>
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
    </div>

    <div class="actions">
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
