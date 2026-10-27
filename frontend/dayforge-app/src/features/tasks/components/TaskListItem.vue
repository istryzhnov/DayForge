<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import type { ID, Priority } from '../../../entities/types'
import type { TaskSchedule } from '../../../entities/TaskEntity'
import type { TaskNode } from '../../../composables/useTaskTree'
import AppIcon from '../../../components/AppIcon.vue'
import { useFormat } from '../../../composables/useFormat'
import {
  describeRecurrence,
  isRepeating,
} from '../../../composables/goalSpace/recurrence'
import TaskComposer from './TaskComposer.vue'
import TaskInlineEditor from './TaskInlineEditor.vue'
import TaskRateEditor from './TaskRateEditor.vue'
import TaskContextMenu from './TaskContextMenu.vue'
import ProjectIcon from '../../goals/components/ProjectIcon.vue'
import TaskTimerButton from '../../timer/components/TaskTimerButton.vue'
import TaskNotesButton from './TaskNotesButton.vue'
import { useTaskRow } from '../composables/useTaskRow'
import type { TaskRowDrag } from '../composables/useTaskDrag'
import { toggleTaskTimer } from '../../timer/composables/useTaskTimerButton'
import { useTimer } from '../../../composables/useTimer'
import { useLogPlanned } from '../../../composables/useLogPlanned'
import { blockFromTask } from '../../../composables/timer/plannedBlocks'

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

const timer = useTimer()
const { formatTime } = useFormat()

/** "Every 2 days", the same wording the Upcoming list uses. */
const repeatLabel = computed(() => {
  const template = props.node.template
  return template?.recurrence && isRepeating(template)
    ? describeRecurrence(template.recurrence)
    : undefined
})

const timeLabel = computed(() => {
  const start = props.node.task.startTime ?? props.node.template?.startTime
  if (!start) return ''
  const end = props.node.task.endTime ?? props.node.template?.endTime
  return end ? `${formatTime(start)} – ${formatTime(end)}` : formatTime(start)
})

/** Repeat and time on one muted line under the title. */
const whenLine = computed(() =>
  [repeatLabel.value, timeLabel.value].filter(Boolean).join(' · '),
)

const notesButton =
  useTemplateRef<InstanceType<typeof TaskNotesButton>>('notesButton')

/** Set from the menu: the notes button shows while its popover is open. */
const notesRequested = ref(false)
const hasNotes = computed(() => !!props.node.template?.notes?.trim())
const showNotes = computed(() => hasNotes.value || notesRequested.value)
const isTimerActive = computed(() =>
  timer.isActiveTask(props.node.task.templateId),
)

async function addNote() {
  notesRequested.value = true
  await nextTick()
  notesButton.value?.openPopover()
}

function onNotesClosed() {
  notesRequested.value = false
}

function toggleTimer() {
  toggleTaskTimer({
    taskId: props.node.task.templateId,
    taskTitle: props.node.task.title,
    goalId: props.node.task.goalId,
  })
}

const planned = useLogPlanned()

/** Read when the menu opens, so the item reflects the entries as they stand. */
function canLogPlanned(): boolean {
  return planned.canLog(blockFromTask(props.node.task))
}

function logPlanned() {
  planned.logBlock(blockFromTask(props.node.task))
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
    :data-drop-major="isProject ? 'true' : undefined"
    :data-task-id="node.task.id"
    :data-tip-anchor="isNested ? undefined : 'task-row'"
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
        <AppIcon
          v-if="isDone"
          class="task-dot-check__mark"
          name="check"
          :size="14"
        />
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

        <p v-if="whenLine" class="task-when ui-oneline">
          <AppIcon v-if="repeatLabel" name="repeat" :size="11" />
          {{ whenLine }}
        </p>

        <div class="task-meta">
          <span v-if="isAllMode" class="task-project-name ui-oneline">
            <span
              class="task-project-name__dot"
              :style="
                node.goalColor ? { background: node.goalColor } : undefined
              "
              aria-hidden="true"
            />
            {{ node.goalTitle }}
          </span>

          <span v-if="isProjectHeader" class="task-progress">
            <AppIcon name="check" :size="11" />
            {{ doneCount }}/{{ totalCount }}
          </span>

          <span
            v-if="hasOwnRate"
            class="task-priority-chip"
            title="This task bills at its own rate"
          >
            {{ node.template?.hourlyRate }} / h
          </span>

          <!-- Repeating tasks only: a running tally of days completed. -->
          <span
            v-if="node.completedCount"
            class="task-repeat-chip"
            :title="`Completed ${node.completedCount} times`"
          >
            <AppIcon name="check" :size="11" />
            {{ node.completedCount }}
          </span>
        </div>
      </div>
    </div>

    <div class="actions">
      <TaskNotesButton
        v-if="showNotes"
        ref="notesButton"
        :notes="node.template?.notes"
        :title="node.task.title"
        @save="saveNotes"
        @close="onNotesClosed"
      />

      <TaskTimerButton
        :task-id="node.task.templateId"
        :title="node.task.title"
        :goal-id="node.task.goalId"
        :rollup-task-ids="childTemplateIds"
      />

      <!-- Nested tasks can't own children, so the affordance would be a dead end. -->
      <button
        v-if="!isNested"
        class="ui-icon-btn ui-icon-btn--outlined task-add-btn"
        type="button"
        aria-label="Add task to this"
        title="Add task to this"
        @click="onToggleParent(node.task.id)"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.4"
          stroke-linecap="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
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
    :has-notes="hasNotes"
    :is-timer-active="isTimerActive"
    :can-log-planned="canLogPlanned()"
    @edit="openEditor(false)"
    @log-planned="logPlanned"
    @add-note="addNote"
    @toggle-timer="toggleTimer"
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
    @submit="
      (title: string, priority: Priority, schedule?: TaskSchedule) =>
        onSubmitSubtask(node.task.templateId, title, priority, schedule)
    "
    @cancel="onCancelSubtask"
  />
</template>
