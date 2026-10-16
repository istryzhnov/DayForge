<script setup lang="ts">
import type { ID, Priority } from '../../../entities/types'
import type { TaskSchedule } from '../../../entities/TaskEntity'
import type { TaskNode } from '../../../composables/useTaskTree'
import TaskComposer from './TaskComposer.vue'
import TaskInlineEditor from './TaskInlineEditor.vue'
import TaskRateEditor from './TaskRateEditor.vue'
import TaskContextMenu from './TaskContextMenu.vue'
import ProjectIcon from '../../goals/components/ProjectIcon.vue'
import TaskTimerButton from '../../timer/components/TaskTimerButton.vue'
import { useTaskRow } from '../composables/useTaskRow'
import type { TaskRowDrag } from '../composables/useTaskDrag'

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
  /** A project header counts the time of everything inside it, too. */
  childTemplateIds?: ID[]
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
  onEditNotes: (templateId: ID, notes: string) => void
  onScheduleTask: (templateId: ID, schedule: TaskSchedule | null) => void
  onSetTaskRate: (templateId: ID, hourlyRate: number | undefined) => void
  onDeleteTask: (templateId: ID) => void
  onSetAsProject: (templateId: ID) => void
  onMoveTask: (templateId: ID) => void
  /** Absent for rows that cannot change their project, like a project header. */
  drag?: TaskRowDrag
  isDragging?: boolean
  /** Where the dragged task would land relative to this row. */
  dropEdge?: 'above' | 'below' | null
}>()

function onRowPointerDown(event: PointerEvent) {
  onPointerDown(event)
  props.drag?.startWithMouse(event)
}

const {
  contextMenuPos,
  isEditing,
  editorStartsScheduled,
  isRateEditing,
  isProject,
  isDone,
  canSetAsProject,
  hasOwnRate,
  isLifted,
  onPointerDown,
  openContextMenu,
  closeContextMenu,
  openEditor,
  closeEditor,
  openRateEditor,
  closeRateEditor,
  saveRate,
  saveEdits,
  saveNotes,
} = useTaskRow(props, {
  onEditTask: props.onEditTask,
  onEditNotes: props.onEditNotes,
  onScheduleTask: props.onScheduleTask,
  onSetTaskRate: props.onSetTaskRate,
  drag: props.drag,
})
</script>

<template>
  <div
    class="task-row"
    :class="{
      'is-lifted': isLifted,
      'task-row--project': isProjectHeader,
      'is-new': node.isNew,
      'is-draggable': !!drag,
      'is-dragging': isDragging,
      'is-drop-above': dropEdge === 'above',
      'is-drop-below': dropEdge === 'below',
      'is-project-tinted': isAllMode && node.goalColor,
    }"
    :style="
      isAllMode && node.goalColor
        ? { '--project-color': node.goalColor }
        : undefined
    "
    :data-drop-row="drag ? node.task.templateId : undefined"
    :data-task-id="node.task.id"
    @contextmenu.prevent="openContextMenu"
    @pointerdown="onRowPointerDown"
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
        <ProjectIcon
          v-else-if="node.goalIcon"
          class="task-dot-check__icon"
          :icon="node.goalIcon"
        />
      </button>

      <div class="task-copy">
        <span class="task-title" :class="{ 'task-done': isDone }">
          {{ node.task.title }}
        </span>

        <div class="task-meta">
          <span
            v-if="isAllMode"
            class="goal-inline-chip"
            :class="{ 'goal-inline-chip--project': node.goalColor }"
          >
            {{ node.goalTitle }}
          </span>

          <span v-if="isProjectHeader" class="task-priority-chip">
            {{ doneCount }} / {{ totalCount }} done
          </span>

          <span
            v-if="hasOwnRate"
            class="task-priority-chip"
            title="This task bills at its own rate"
          >
            {{ node.template?.hourlyRate }} / h
          </span>

          <!-- Shown only when there is something to read; opens the editor. -->
          <button
            v-if="node.template?.notes"
            type="button"
            class="task-notes-btn"
            aria-label="Has notes"
            title="Edit notes"
            @click="openEditor(false)"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path
                d="M3.5 2.5h6l3 3v8h-9z M9.5 2.5v3h3 M5.5 8.5h5 M5.5 11h3"
                fill="none"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linejoin="round"
                stroke-linecap="round"
              />
            </svg>
          </button>

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
      <TaskTimerButton
        :task-id="node.task.templateId"
        :title="node.task.title"
        :goal-id="node.task.goalId"
        :rollup-task-ids="childTemplateIds"
      />

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
    :can-move="!isNested"
    :is-scheduled="!!node.task.startTime"
    :has-own-rate="hasOwnRate"
    @edit="openEditor(false)"
    @schedule="openEditor(true)"
    @set-rate="openRateEditor"
    @move="onMoveTask(node.task.templateId)"
    @delete="onDeleteTask(node.task.templateId)"
    @add-to-this="onToggleParent(node.task.id)"
    @toggle-check="onToggleDone(node.task.id)"
    @set-as-project="onSetAsProject(node.task.templateId)"
    @show-habit="onFocusProject(node.task.id)"
    @close="closeContextMenu"
  />

  <TaskInlineEditor
    v-if="isEditing"
    :node="node"
    :open-scheduled="editorStartsScheduled"
    @save="(payload) => saveEdits(payload.title, payload.schedule)"
    @save-notes="(notes) => saveNotes(notes)"
    @close="closeEditor"
  />

  <TaskRateEditor
    v-if="isRateEditing"
    :node="node"
    @save="(hourlyRate) => saveRate(hourlyRate)"
    @close="closeRateEditor"
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
