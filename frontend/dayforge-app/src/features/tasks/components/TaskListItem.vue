<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { ID, Priority } from '../../../entities/types'
import type { TaskSchedule } from '../../../entities/TaskEntity'
import type { TaskNode } from '../../../composables/useTaskTree'
import { PRIORITY, TASK_STATUS } from '../../../entities/constants'
import TaskComposer from './TaskComposer.vue'
import TaskContextMenu from './TaskContextMenu.vue'
import { useIsCoarsePointer } from '../../../composables/useMediaQuery'
import { usePressGesture } from '../../../composables/usePressGesture'

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

const contextMenuPos = ref<{ x: number; y: number } | null>(null)
const isEditing = ref(false)
const editValue = ref(props.node.task.title)
const titleInputRef = ref<HTMLInputElement | null>(null)

const isProject = computed(() => props.node.task.priority === PRIORITY.MAJOR)
const isDone = computed(() => props.node.task.status === TASK_STATUS.DONE)
// Only a top-level plain task can become a project — nesting stops at two levels.
const canSetAsProject = computed(() => !isProject.value && !props.isNested)

function openContextMenu(event: MouseEvent) {
  contextMenuPos.value = { x: event.clientX, y: event.clientY }
}

function closeContextMenu() {
  contextMenuPos.value = null
}

const isCoarsePointer = useIsCoarsePointer()

// Touch has no right-click, so a long press opens the same menu. The row isn't
// draggable, so the menu opens as soon as the press registers rather than
// waiting for the finger to lift.
const { isLifted, onPointerDown } = usePressGesture({
  isEnabled: () => isCoarsePointer.value,
  onLift: (point) => {
    contextMenuPos.value = { x: point.x, y: point.y }
  },
})

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
