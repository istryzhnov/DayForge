<script setup lang="ts">
import { nextTick, ref } from 'vue'
import type { ID, Priority } from '../../../entities/types'
import type { MajorDecision } from '../../../entities/TaskEntity'
import type { FlatTaskNode } from '../../../composables/useTaskTree'
import {
  MAJOR_DECISION,
  PRIORITY,
  TASK_STATUS,
} from '../../../entities/constants'
import TaskComposer from './TaskComposer.vue'
import TaskContextMenu from './TaskContextMenu.vue'

const props = defineProps<{
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
  onEditTask: (templateId: ID, title: string) => void
  onDeleteTask: (templateId: ID) => void
}>()

const contextMenuPos = ref<{ x: number; y: number } | null>(null)
const isEditing = ref(false)
const editValue = ref(props.node.task.title)
const titleInputRef = ref<HTMLInputElement | null>(null)

function openContextMenu(event: MouseEvent) {
  contextMenuPos.value = { x: event.clientX, y: event.clientY }
}

function closeContextMenu() {
  contextMenuPos.value = null
}

function startEditing() {
  editValue.value = props.node.task.title
  isEditing.value = true
  nextTick(() => titleInputRef.value?.focus())
}

function commitEditing() {
  isEditing.value = false
  if (editValue.value.trim() === props.node.task.title) return
  props.onEditTask(props.node.task.templateId, editValue.value)
}

function cancelEditing() {
  isEditing.value = false
  editValue.value = props.node.task.title
}
</script>

<template>
  <div
    class="task-row"
    :style="`padding-left: ${14 + node.depth * 16}px`"
    @contextmenu.prevent="openContextMenu"
  >
    <div class="task-main">
      <button
        v-if="node.task.priority === PRIORITY.MINOR"
        type="button"
        class="task-dot-check"
        :class="{ 'is-done': node.task.status === TASK_STATUS.DONE }"
        :aria-label="
          node.task.status === TASK_STATUS.DONE
            ? 'Mark as not done'
            : 'Mark as done'
        "
        @click="onToggleMinor(node.task.id)"
      >
        <span
          v-if="node.task.status === TASK_STATUS.DONE"
          class="task-dot-check__mark"
          >✓</span
        >
      </button>
      <span v-else class="dot" :class="node.task.priority"></span>

      <div class="task-copy">
        <input
          v-if="isEditing"
          ref="titleInputRef"
          v-model="editValue"
          class="task-title-input"
          type="text"
          @keydown.enter="commitEditing"
          @keydown.esc="cancelEditing"
          @blur="commitEditing"
        />
        <span
          v-else
          class="task-title"
          :class="{ 'task-done': node.task.status === TASK_STATUS.DONE }"
        >
          {{ node.task.title }}
        </span>

        <div class="task-meta">
          <span v-if="isAllMode" class="goal-inline-chip">
            {{ node.goalTitle }}
          </span>

          <span
            v-if="node.task.priority === PRIORITY.MAJOR"
            class="task-priority-chip"
          >
            {{ node.minorDone }} / {{ node.minorTotal }} done
          </span>

          <span
            v-if="node.task.priority === PRIORITY.MINOR && node.majorTitle"
            class="major-inline-chip"
          >
            {{ node.majorTitle }}
          </span>
        </div>
      </div>
    </div>

    <div class="actions">
      <template
        v-if="node.task.priority === PRIORITY.MAJOR && node.canResolveMajor"
      >
        <button
          class="btn btn-ghost"
          @click="onResolveMajor(node.task.id, MAJOR_DECISION.CONTINUE)"
        >
          Continue work
        </button>
        <button
          class="btn btn-primary"
          @click="onResolveMajor(node.task.id, MAJOR_DECISION.DONE)"
        >
          Close space
        </button>
        <button
          v-if="node.task.priority === PRIORITY.MAJOR"
          class="btn btn-ghost"
          @click="onFocusMajor(node.task.id)"
        >
          Habit
        </button>
      </template>
      <button
        class="task-add-btn"
        type="button"
        aria-label="Add subtask"
        title="Add subtask"
        @click="onToggleParent(node.task.id)"
      >
        +
      </button>
    </div>
  </div>

  <TaskContextMenu
    v-if="contextMenuPos"
    :x="contextMenuPos.x"
    :y="contextMenuPos.y"
    :can-check="node.task.priority === PRIORITY.MINOR"
    :is-done="node.task.status === TASK_STATUS.DONE"
    @edit="startEditing"
    @delete="onDeleteTask(node.task.templateId)"
    @add-to-this="onToggleParent(node.task.id)"
    @toggle-check="onToggleMinor(node.task.id)"
    @close="closeContextMenu"
  />

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
