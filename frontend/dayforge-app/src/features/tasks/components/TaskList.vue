<script setup lang="ts">
import type { ID, Priority } from '../../../entities/types'
import type { TaskSchedule } from '../../../entities/TaskEntity'
import type { TaskGroup, TaskNode } from '../../../composables/useTaskTree'
import { PRIORITY } from '../../../entities/constants'
import { useTaskListState } from '../composables/useTaskListState'
import {
  DROP_ZONE_ROOT,
  useTaskDrag,
  type TaskDropPayload,
} from '../composables/useTaskDrag'
import DragGhost from '../../../components/DragGhost.vue'
import TaskListItem from './TaskListItem.vue'

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
  (e: 'edit-notes', templateId: ID, notes: string): void
  (e: 'schedule-task', templateId: ID, schedule: TaskSchedule | null): void
  (e: 'set-task-rate', templateId: ID, hourlyRate: number | undefined): void
  (e: 'delete-task', templateId: ID): void
  (e: 'set-as-project', templateId: ID): void
  (e: 'move-task', templateId: ID): void
  (e: 'move-task-to', payload: TaskDropPayload): void
}>()

const drag = useTaskDrag({ onMove: (payload) => emit('move-task-to', payload) })

function dropEdge(node: TaskNode) {
  if (drag.dropRowId.value !== node.task.templateId) return null
  return drag.dropAbove.value ? 'above' : 'below'
}

function rowDrag(node: TaskNode, parentZone: string) {
  return drag.forRow({
    templateId: node.task.templateId,
    title: node.task.title,
    parentZone,
    goalId: node.task.goalId,
    // A task inside a project row leaves that row when it lands in another project.
    canMove: true,
    color: node.goalColor,
    isMajor: node.task.priority === PRIORITY.MAJOR,
  })
}

const {
  activeParentId,
  toggleParent,
  handleSubtaskSubmit,
  toggleDone,
  editTask,
  editNotes,
  scheduleTask,
  setTaskRate,
  deleteTask,
  setAsProject,
  moveTask,
} = useTaskListState({
  onAddSubtask: (parentTemplateId, title, priority, schedule) =>
    emit('add-subtask', parentTemplateId, title, priority, schedule),
  onToggleDone: (taskId) => emit('toggle-done', taskId),
  onEditTask: (templateId, title) => emit('edit-task', templateId, title),
  onEditNotes: (templateId, notes) => emit('edit-notes', templateId, notes),
  onScheduleTask: (templateId, schedule) =>
    emit('schedule-task', templateId, schedule),
  onSetTaskRate: (templateId, hourlyRate) =>
    emit('set-task-rate', templateId, hourlyRate),
  onDeleteTask: (templateId) => emit('delete-task', templateId),
  onSetAsProject: (templateId) => emit('set-as-project', templateId),
  onMoveTask: (templateId) => emit('move-task', templateId),
})

function sharedHandlers() {
  return {
    onToggleDone: toggleDone,
    onToggleParent: toggleParent,
    onSubmitSubtask: handleSubtaskSubmit,
    onCancelSubtask: () => (activeParentId.value = null),
    onEditTask: editTask,
    onEditNotes: editNotes,
    onScheduleTask: scheduleTask,
    onSetTaskRate: setTaskRate,
    onDeleteTask: deleteTask,
    onSetAsProject: setAsProject,
    onMoveTask: moveTask,
  }
}

function groupKey(group: TaskGroup) {
  return group.kind === 'project' ? group.project.task.id : group.node.task.id
}
</script>

<template>
  <!-- Dropping outside any project block takes a task out of its project. -->
  <div
    v-if="groups.length"
    class="task-list"
    :class="{ 'is-drop-target': drag.dropZone.value === DROP_ZONE_ROOT }"
    :data-drop-zone="DROP_ZONE_ROOT"
  >
    <template v-for="group in groups" :key="groupKey(group)">
      <!-- A project that actually groups something gets its own block. -->
      <div
        v-if="group.kind === 'project'"
        class="task-project"
        :class="{
          'is-drop-target':
            drag.dropZone.value === group.project.task.templateId,
        }"
        :data-drop-zone="group.project.task.templateId"
      >
        <TaskListItem
          :node="group.project"
          :is-all-mode="isAllMode"
          :is-active-parent="activeParentId === group.project.task.id"
          :is-project-header="true"
          :done-count="group.doneCount"
          :total-count="group.totalCount"
          :child-template-ids="
            group.children.map((child) => child.task.templateId)
          "
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
            :drag="rowDrag(child, group.project.task.templateId)"
            :is-dragging="drag.draggingId.value === child.task.templateId"
            :drop-edge="dropEdge(child)"
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
        :drag="
          group.node.task.priority === PRIORITY.MAJOR
            ? undefined
            : rowDrag(group.node, DROP_ZONE_ROOT)
        "
        :is-dragging="drag.draggingId.value === group.node.task.templateId"
        :drop-edge="dropEdge(group.node)"
        v-bind="sharedHandlers()"
      />
    </template>

    <!-- Nothing else inside the list is free space, so taking a task out of a
         project needs a target of its own. -->
    <div
      v-if="
        drag.draggingId.value && drag.dragParentZone.value !== DROP_ZONE_ROOT
      "
      class="task-drop-out"
      :class="{ 'is-drop-target': drag.dropZone.value === DROP_ZONE_ROOT }"
      :data-drop-zone="DROP_ZONE_ROOT"
    >
      Drop here to take it out of the project
    </div>

    <DragGhost
      v-if="drag.draggingId.value"
      :title="drag.dragTitle.value"
      :x="drag.pointer.value.x"
      :y="drag.pointer.value.y"
      :color="drag.dragColor.value"
      :is-major="drag.dragIsMajor.value"
      :touch="drag.dragIsTouch.value"
    />
  </div>

  <!-- The composer row above is the way in, so an empty list only says so. -->
  <p v-else class="task-empty">Nothing planned yet.</p>
</template>
