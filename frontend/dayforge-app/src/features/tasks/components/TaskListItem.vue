<script setup lang="ts">
import type { ID, Priority } from '../../../entities/types'
import type { TaskSchedule } from '../../../entities/TaskEntity'
import type { TaskNode } from '../../../composables/useTaskTree'
import TaskComposer from './TaskComposer.vue'
import TaskContextMenu from './TaskContextMenu.vue'
import { useTaskRow } from '../composables/useTaskRow'

const props = defineProps<{
  node: TaskNode
  isAllMode: boolean
  isActiveParent: boolean
  /** Rendered as the header of a project block rather than a standalone row. */
  isProjectHeader?: boolean
  /** Nested inside a project, so it can neither own children nor be promoted. */
  isNested?: boolean
  doneCount?: number
  totalCount?: number
  onToggleDone: (taskId: ID) => void
  onToggleParent: (taskId: ID) => void
  onSubmitSubtask: (
    parentTemplateId: ID,
    title: string,
    priority: Priority,
    schedule?: TaskSchedule,
  ) => void
  onCancelSubtask: () => void
  onFocusProject: (dailyTaskId: ID) => void
  onEditTask: (templateId: ID, title: string) => void
  onDeleteTask: (templateId: ID) => void
  onSetAsProject: (templateId: ID) => void
}>()

const {
  contextMenuPos,
  isEditing,
  editValue,
  isProject,
  isDone,
  canSetAsProject,
  isLifted,
  onPointerDown,
  openContextMenu,
  closeContextMenu,
  startEditing,
  commitEditing,
  cancelEditing,
} = useTaskRow(props, { onEditTask: props.onEditTask })
</script>

<template>
  <div
    class="task-row"
    :class="{
      'is-lifted': isLifted,
      'task-row--project': isProjectHeader,
      'is-new': node.isNew,
    }"
    @contextmenu.prevent="openContextMenu"
    @pointerdown="onPointerDown"
  >
    <div class="task-main">
      <button
        type="button"
        class="task-dot-check"
        :class="{
          'is-done': isDone,
          'task-dot-check--project': isProject,
        }"
        :aria-label="isDone ? 'Mark as not done' : 'Mark as done'"
        @click="onToggleDone(node.task.id)"
      >
        <span v-if="isDone" class="task-dot-check__mark">✓</span>
      </button>

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
        <span v-else class="task-title" :class="{ 'task-done': isDone }">
          {{ node.task.title }}
        </span>

        <div class="task-meta">
          <span v-if="isAllMode" class="goal-inline-chip">
            {{ node.goalTitle }}
          </span>

          <span v-if="isProjectHeader" class="task-priority-chip">
            {{ doneCount }} / {{ totalCount }} done
          </span>

          <!-- Repeating tasks only: a running tally of days completed. -->
          <span
            v-if="node.completedCount"
            class="task-repeat-chip"
            :title="`Completed ${node.completedCount} times`"
          >
            ✓ {{ node.completedCount }}
          </span>
        </div>
      </div>
    </div>

    <div class="actions">
      <!-- Nested tasks can't own children, so the affordance would be a dead end. -->
      <button
        v-if="!isNested"
        class="task-add-btn"
        type="button"
        aria-label="Add task to this"
        title="Add task to this"
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
    :is-done="isDone"
    :can-set-as-project="canSetAsProject"
    :can-add-child="!isNested"
    :is-project="isProject"
    @edit="startEditing"
    @delete="onDeleteTask(node.task.templateId)"
    @add-to-this="onToggleParent(node.task.id)"
    @toggle-check="onToggleDone(node.task.id)"
    @set-as-project="onSetAsProject(node.task.templateId)"
    @show-habit="onFocusProject(node.task.id)"
    @close="closeContextMenu"
  />

  <TaskComposer
    v-if="isActiveParent"
    :is-subtask="true"
    :is-all-mode="false"
    @submit="
      (title: string, priority: Priority, schedule?: TaskSchedule) =>
        onSubmitSubtask(node.task.templateId, title, priority, schedule)
    "
    @cancel="onCancelSubtask"
  />
</template>
