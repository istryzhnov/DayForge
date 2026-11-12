<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ID, Priority } from '../../../entities/types'
import type { TaskSchedule } from '../../../entities/TaskEntity'
import type { TaskGroup, TaskNode } from '../../../composables/useTaskTree'
import { PRIORITY } from '../../../entities/constants'
import { useTaskActions } from '../composables/useTaskActions'
import { DROP_ZONE_ROOT } from '../composables/dropRules'
import { useTaskDrag } from '../composables/useTaskDrag'
import DragGhost from '../../../components/DragGhost.vue'
import TaskListItem from './TaskListItem.vue'

defineProps<{
  groups: TaskGroup[]
  isAllMode: boolean
}>()

// Only what the panel above reacts to. Changes to a task go straight from the
// row to useTaskActions().
const emit = defineEmits<{
  (e: 'focus-project', dailyTaskId: ID): void
  (e: 'move-task', templateId: ID): void
}>()

const { t } = useI18n()
const actions = useTaskActions()
const drag = useTaskDrag({ onMove: actions.moveTo })

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

/** The row whose "add a task to this" composer is open; one at a time. */
const activeParentId = ref<ID | null>(null)

function toggleParent(nodeId: ID) {
  activeParentId.value = activeParentId.value === nodeId ? null : nodeId
}

function submitSubtask(
  parentTemplateId: ID,
  title: string,
  priority: Priority,
  schedule?: TaskSchedule,
) {
  actions.addSubtask(parentTemplateId, title, priority, schedule)
  activeParentId.value = null
}

/** The listeners every row gets, whichever of the three places it is drawn in. */
const rowListeners = {
  onToggleParent: toggleParent,
  onSubmitSubtask: submitSubtask,
  onCancelSubtask: () => (activeParentId.value = null),
  onFocusProject: (dailyTaskId: ID) => emit('focus-project', dailyTaskId),
  onMoveTask: (templateId: ID) => emit('move-task', templateId),
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
      <!-- A project block is dragged as a whole: its header carries the gesture,
           and the drop line goes around the block rather than one row. -->
      <div
        v-if="group.kind === 'project'"
        class="task-project"
        :class="{
          'is-drop-target':
            drag.dropZone.value === group.project.task.templateId,
          'is-dragging':
            drag.draggingId.value === group.project.task.templateId,
          'is-drop-above': dropEdge(group.project) === 'above',
          'is-drop-below': dropEdge(group.project) === 'below',
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
          :drag="rowDrag(group.project, DROP_ZONE_ROOT)"
          v-bind="rowListeners"
        />

        <div class="task-project__children">
          <TaskListItem
            v-for="child in group.children"
            :key="child.task.id"
            :node="child"
            :is-all-mode="isAllMode"
            :is-active-parent="activeParentId === child.task.id"
            :is-nested="true"
            :drag="rowDrag(child, group.project.task.templateId)"
            :is-dragging="drag.draggingId.value === child.task.templateId"
            :drop-edge="dropEdge(child)"
            v-bind="rowListeners"
          />
        </div>
      </div>

      <TaskListItem
        v-else
        :node="group.node"
        :is-all-mode="isAllMode"
        :is-active-parent="activeParentId === group.node.task.id"
        :drag="rowDrag(group.node, DROP_ZONE_ROOT)"
        :is-dragging="drag.draggingId.value === group.node.task.templateId"
        :drop-edge="dropEdge(group.node)"
        v-bind="rowListeners"
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
      {{ t('tasks.dropOutOfProject') }}
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
  <p v-else class="task-empty">{{ t('tasks.nothingPlanned') }}</p>
</template>
