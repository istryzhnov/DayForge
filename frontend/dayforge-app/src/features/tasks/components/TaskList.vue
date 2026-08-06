<script setup lang="ts">
import type { ID, Priority } from '../../../entities/types'
import type { MajorDecision } from '../../../entities/TaskEntity'
import type { FlatTaskNode } from '../../../composables/useTaskTree'
import { TASK_STATUS } from '../../../entities/constants'
import { useTaskListState } from '../composables/useTaskListState'
import TaskListItem from './TaskListItem.vue'

defineProps<{
  nodes: FlatTaskNode[]
  isAllMode: boolean
}>()

const emit = defineEmits<{
  (e: 'add-subtask', parentId: ID, title: string, priority: Priority): void
  (e: 'toggle-minor', dailyTaskId: ID): void
  (e: 'resolve-major', dailyMajorTaskId: ID, decision: MajorDecision): void
  (e: 'focus-major', dailyMajorTaskId: ID): void
  (e: 'edit-task', templateId: ID, title: string): void
  (e: 'delete-task', templateId: ID): void
}>()

const {
  activeParentId,
  toggleParent,
  handleSubtaskSubmit,
  toggleMinor,
  resolveMajor,
  editTask,
  deleteTask,
} = useTaskListState({
  onAddSubtask: (parentTemplateId, title, priority) =>
    emit('add-subtask', parentTemplateId, title, priority),
  onToggleMinor: (taskId) => emit('toggle-minor', taskId),
  onResolveMajor: (taskId, decision) => emit('resolve-major', taskId, decision),
  onEditTask: (templateId, title) => emit('edit-task', templateId, title),
  onDeleteTask: (templateId) => emit('delete-task', templateId),
})
</script>

<template>
  <div v-if="nodes.length" class="task-list">
    <TaskListItem
      v-for="node in nodes"
      :key="node.task.id"
      :node="node"
      :is-all-mode="isAllMode"
      :is-active-parent="activeParentId === node.task.id"
      :is-minor-done="node.task.status === TASK_STATUS.DONE"
      :on-toggle-minor="toggleMinor"
      :on-resolve-major="resolveMajor"
      :on-toggle-parent="toggleParent"
      :on-submit-subtask="handleSubtaskSubmit"
      :on-cancel-subtask="() => (activeParentId = null)"
      :on-focus-major="(majorId: ID) => emit('focus-major', majorId)"
      :on-edit-task="editTask"
      :on-delete-task="deleteTask"
    />
  </div>

  <p v-else class="task-empty">No tasks yet</p>
</template>
