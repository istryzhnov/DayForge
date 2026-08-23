<script setup lang="ts">
import type { ID, Priority } from '../../../entities/types'
import type { TaskSchedule } from '../../../entities/TaskEntity'
import type { TaskGroup } from '../../../composables/useTaskTree'
import { useTaskListState } from '../composables/useTaskListState'
import TaskListItem from './TaskListItem.vue'
import TaskQuickAdd from './TaskQuickAdd.vue'

defineProps<{
  groups: TaskGroup[]
  isAllMode: boolean
}>()

const emit = defineEmits<{
  (
    e: 'add-subtask',
    parentId: ID,
    title: string,
    priority: Priority,
    schedule?: TaskSchedule,
  ): void
  (e: 'toggle-done', dailyTaskId: ID): void
  (e: 'focus-project', dailyTaskId: ID): void
  (e: 'edit-task', templateId: ID, title: string): void
  (e: 'delete-task', templateId: ID): void
  (e: 'set-as-project', templateId: ID): void
  (e: 'quick-add', title: string, schedule?: TaskSchedule): void
}>()

const {
  activeParentId,
  toggleParent,
  handleSubtaskSubmit,
  toggleDone,
  editTask,
  deleteTask,
  setAsProject,
} = useTaskListState({
  onAddSubtask: (parentTemplateId, title, priority, schedule) =>
    emit('add-subtask', parentTemplateId, title, priority, schedule),
  onToggleDone: (taskId) => emit('toggle-done', taskId),
  onEditTask: (templateId, title) => emit('edit-task', templateId, title),
  onDeleteTask: (templateId) => emit('delete-task', templateId),
  onSetAsProject: (templateId) => emit('set-as-project', templateId),
})

function sharedHandlers() {
  return {
    onToggleDone: toggleDone,
    onToggleParent: toggleParent,
    onSubmitSubtask: handleSubtaskSubmit,
    onCancelSubtask: () => (activeParentId.value = null),
    onEditTask: editTask,
    onDeleteTask: deleteTask,
    onSetAsProject: setAsProject,
  }
}

// `<template v-for>` must carry the key itself — putting it on the v-if/v-else
// branches instead makes Vue drop entries.
function groupKey(group: TaskGroup) {
  return group.kind === 'project' ? group.project.task.id : group.node.task.id
}
</script>

<template>
  <div v-if="groups.length" class="task-list">
    <template v-for="group in groups" :key="groupKey(group)">
      <!-- A project that actually groups something gets its own block. -->
      <div v-if="group.kind === 'project'" class="task-project">
        <TaskListItem
          :node="group.project"
          :is-all-mode="isAllMode"
          :is-active-parent="activeParentId === group.project.task.id"
          :is-project-header="true"
          :done-count="group.doneCount"
          :total-count="group.totalCount"
          :on-focus-project="(id: ID) => emit('focus-project', id)"
          v-bind="sharedHandlers()"
        />

        <div class="task-project__children">
          <TaskListItem
            v-for="child in group.children"
            :key="child.task.id"
            :node="child"
            :is-all-mode="isAllMode"
            :is-active-parent="activeParentId === child.task.id"
            :is-nested="true"
            :on-focus-project="(id: ID) => emit('focus-project', id)"
            v-bind="sharedHandlers()"
          />
        </div>
      </div>

      <TaskListItem
        v-else
        :node="group.node"
        :is-all-mode="isAllMode"
        :is-active-parent="activeParentId === group.node.task.id"
        :on-focus-project="(id: ID) => emit('focus-project', id)"
        v-bind="sharedHandlers()"
      />
    </template>
  </div>

  <TaskQuickAdd
    v-else
    @submit="
      (title: string, schedule?: TaskSchedule) =>
        emit('quick-add', title, schedule)
    "
  />
</template>
