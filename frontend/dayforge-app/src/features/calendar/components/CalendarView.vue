<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DailyTask, MajorTaskOption } from '../../../entities/TaskEntity'
import type { ID, ISODate } from '../../../entities/types'
import { PRIORITY, TASK_STATUS } from '../../../entities/constants'
import CalendarEventBlock from './CalendarEventBlock.vue'
import CalendarTaskContextMenu from './CalendarTaskContextMenu.vue'
import CalendarUnscheduledItem from './CalendarUnscheduledItem.vue'
import EventDetailsPanel from './EventDetailsPanel.vue'
import { useIsCoarsePointer } from '../../../composables/useMediaQuery'
import type { GesturePoint } from '../../../composables/usePressGesture'
import {
  DAY_START_HOUR,
  GRID_HEIGHT_PX,
  HOURS,
  PX_PER_MINUTE,
  minutesFromDayStart,
} from '../composables/useCalendarGrid'
import { useCalendarDragDrop } from '../composables/useCalendarDragDrop'
import { useCalendarDraft } from '../composables/useCalendarDraft'
import { useCalendarSelection } from '../composables/useCalendarSelection'

const props = defineProps<{
  tasks: DailyTask[]
  currentDate: ISODate
  projectOptions: MajorTaskOption[]
}>()

const emit = defineEmits<{
  (e: 'prev-day'): void
  (e: 'next-day'): void
  (e: 'today'): void
  (
    e: 'schedule-task',
    payload: { taskId: ID; startTime: string; endTime: string },
  ): void
  (e: 'unschedule-task', taskId: ID): void
  (
    e: 'create-task',
    payload: { title: string; startTime: string; endTime: string },
  ): void
  (e: 'toggle-task-done', taskId: ID): void
  (e: 'edit-task', templateId: ID, title: string): void
  (e: 'attach-to-project', templateId: ID, projectTemplateId: ID | null): void
}>()

const gridRef = ref<HTMLElement | null>(null)
const unscheduledRef = ref<HTMLElement | null>(null)
const isCoarsePointer = useIsCoarsePointer()

// Only pinned over the viewport on the mobile layout; on desktop it is a normal
// side column and shouldn't shrink the auto-scroll zone.
function bottomInset() {
  if (!isCoarsePointer.value) return 0
  const element = unscheduledRef.value
  if (!element || getComputedStyle(element).position !== 'fixed') return 0
  return element.getBoundingClientRect().height
}

const scheduledTasks = computed(() =>
  props.tasks.filter((task) => task.startTime && task.endTime),
)
/**
 * What still needs a slot on the grid. Excludes projects (containers, not
 * things you drop on a time) and anything already finished — a completed task
 * has nothing left to schedule. Done tasks that *are* scheduled stay on the
 * grid as a record of the day.
 */
const unscheduledTasks = computed(() =>
  props.tasks.filter(
    (task) =>
      !task.startTime &&
      task.priority !== PRIORITY.MAJOR &&
      task.status !== TASK_STATUS.DONE,
  ),
)

const dateLabel = computed(() =>
  new Date(`${props.currentDate}T00:00:00`).toLocaleDateString('uk-UA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }),
)

const {
  selectedTask,
  contextMenuTask,
  contextMenuPos,
  isContextMenuOpen,
  openDetails,
  closeDetails,
  openContextMenu,
  closeContextMenu,
} = useCalendarSelection({ getTasks: () => props.tasks })

const {
  touchDrag,
  draggingTaskId,
  onDragStartFromList,
  onBlockDragStart,
  onGridDragOver,
  onGridDrop,
  beginTouchDrag,
  updateTouchDrag,
  endTouchDrag,
  cancelTouchDrag,
} = useCalendarDragDrop({
  getGridElement: () => gridRef.value,
  findTask: (taskId) => props.tasks.find((task) => task.id === taskId),
  onSchedule: (payload) => emit('schedule-task', payload),
  getBottomInset: bottomInset,
})

const {
  draftRange,
  showDraftForm,
  draftTitle,
  onGridPointerDown,
  onGridTap,
  submitDraft,
  cancelDraft,
} = useCalendarDraft({
  getGridElement: () => gridRef.value,
  isCoarsePointer: () => isCoarsePointer.value,
  // A tap that dismisses an open menu shouldn't also start a new task.
  canStartDraft: () => !isContextMenuOpen.value,
  onCreate: (payload) => emit('create-task', payload),
})

/** The dragged task previews at the finger's position rather than its stored time. */
function topPxFor(task: DailyTask) {
  const preview = touchDrag.value
  const startMin =
    preview?.taskId === task.id
      ? preview.startMin
      : minutesFromDayStart(task.startTime!)
  return startMin * PX_PER_MINUTE
}

function heightPxFor(task: DailyTask) {
  const startMin = minutesFromDayStart(task.startTime!)
  const endMin = minutesFromDayStart(task.endTime!)
  return (endMin - startMin) * PX_PER_MINUTE
}

/** An unscheduled task being dragged in has no block yet, so preview a floating one. */
const incomingPreview = computed(() => {
  const preview = touchDrag.value
  if (!preview?.isNewlyScheduled) return null

  const task = props.tasks.find((item) => item.id === preview.taskId)
  if (!task) return null

  return {
    title: task.title,
    priority: task.priority,
    top: preview.startMin * PX_PER_MINUTE,
    height: preview.durationMin * PX_PER_MINUTE,
  }
})

function previewStyle(top: number, height: number) {
  return { top: `${top}px`, height: `${Math.max(height, 20)}px` }
}

function onBlockTouchLift(payload: { taskId: ID; grabOffsetMinutes: number }) {
  closeContextMenu()
  beginTouchDrag(payload.taskId, payload.grabOffsetMinutes)
}

function onUnscheduledTouchLift(taskId: ID) {
  closeContextMenu()
  beginTouchDrag(taskId, 0)
}

function onResize(payload: { taskId: ID; endTime: string }) {
  const task = props.tasks.find((item) => item.id === payload.taskId)
  if (!task?.startTime) return
  emit('schedule-task', {
    taskId: task.id,
    startTime: task.startTime,
    endTime: payload.endTime,
  })
}

function handleToggleTaskDone() {
  const taskId = contextMenuTask.value?.id
  if (taskId) emit('toggle-task-done', taskId)
}

/** The select works in template ids, but the row only stores its parent row id. */
const selectedProjectTemplateId = computed(() => {
  const parentRowId = selectedTask.value?.parentDailyTaskId
  if (!parentRowId) return null
  return (
    props.tasks.find((task) => task.id === parentRowId)?.templateId ?? null
  )
})

function handleUnschedule(taskId: ID) {
  emit('unschedule-task', taskId)
  closeDetails()
}

function handleUpdateTime(payload: {
  taskId: ID
  startTime: string
  endTime: string
}) {
  emit('schedule-task', payload)
  closeDetails()
}

function onGridClick(event: MouseEvent) {
  if (isContextMenuOpen.value) {
    closeContextMenu()
    return
  }
  onGridTap(event)
}

function hourLineTop(hour: number) {
  return { top: `${(hour - DAY_START_HOUR) * 60 * PX_PER_MINUTE}px` }
}

function gridStyle(heightPx: number) {
  return { height: `${heightPx}px` }
}

function onTouchMove(point: GesturePoint) {
  updateTouchDrag(point)
}

function onTouchDrop(point: GesturePoint) {
  endTouchDrag(point)
}
</script>

<template>
  <section class="calendar-view" :class="{ 'is-touch': isCoarsePointer }">
    <header class="calendar-view__header">
      <button class="btn btn-ghost" type="button" @click="emit('prev-day')">
        ‹
      </button>
      <div class="calendar-view__date">
        <strong>{{ dateLabel }}</strong>
        <button class="btn btn-ghost" type="button" @click="emit('today')">
          Today
        </button>
      </div>
      <button class="btn btn-ghost" type="button" @click="emit('next-day')">
        ›
      </button>
    </header>

    <div class="calendar-view__body">
      <div class="calendar-view__grid-wrap">
        <div class="calendar-view__hours">
          <div
            v-for="hour in HOURS"
            :key="hour"
            class="calendar-view__hour-label"
          >
            {{ String(hour).padStart(2, '0') }}:00
          </div>
        </div>

        <div
          ref="gridRef"
          class="calendar-view__grid"
          :class="{ 'is-dragging': touchDrag }"
          :style="gridStyle(GRID_HEIGHT_PX)"
          @pointerdown="onGridPointerDown"
          @click="onGridClick"
          @dragover="onGridDragOver"
          @drop="onGridDrop"
        >
          <div
            v-for="hour in HOURS"
            :key="hour"
            class="calendar-view__hour-line"
            :style="hourLineTop(hour)"
          ></div>

          <CalendarEventBlock
            v-for="task in scheduledTasks"
            :key="task.id"
            :task="task"
            :top-px="topPxFor(task)"
            :height-px="heightPxFor(task)"
            :is-dragging="draggingTaskId === task.id"
            @select="openDetails"
            @drag-start="onBlockDragStart"
            @resize="onResize"
            @context-menu="openContextMenu"
            @touch-lift="onBlockTouchLift"
            @touch-move="onTouchMove"
            @touch-drop="onTouchDrop"
            @touch-cancel="cancelTouchDrag"
          />

          <div
            v-if="incomingPreview"
            class="cal-event cal-event--preview"
            :class="incomingPreview.priority"
            :style="previewStyle(incomingPreview.top, incomingPreview.height)"
          >
            <span class="cal-event__title">{{ incomingPreview.title }}</span>
          </div>

          <div
            v-if="draftRange"
            class="calendar-view__draft"
            :style="
              previewStyle(
                draftRange.startMin * PX_PER_MINUTE,
                (draftRange.endMin - draftRange.startMin) * PX_PER_MINUTE,
              )
            "
          >
            <form
              v-if="showDraftForm"
              class="calendar-view__draft-form"
              @submit.prevent="submitDraft"
            >
              <input
                v-model="draftTitle"
                type="text"
                placeholder="Task title"
                autofocus
                @keydown.esc="cancelDraft"
              />
              <div class="calendar-view__draft-actions">
                <button type="submit" class="btn btn-primary">Add</button>
                <button type="button" class="btn btn-ghost" @click="cancelDraft">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <aside ref="unscheduledRef" class="calendar-view__unscheduled">
        <p class="sidebar-caption">Unscheduled</p>
        <CalendarUnscheduledItem
          v-for="task in unscheduledTasks"
          :key="task.id"
          :task="task"
          @drag-start="onDragStartFromList"
          @touch-lift="onUnscheduledTouchLift"
          @touch-move="onTouchMove"
          @touch-drop="onTouchDrop"
          @touch-cancel="cancelTouchDrag"
          @context-menu="openContextMenu"
        />
        <p v-if="!unscheduledTasks.length" class="calendar-view__empty-hint">
          Nothing left to schedule
        </p>
      </aside>
    </div>

    <p v-if="isCoarsePointer" class="calendar-view__touch-hint">
      Tap an empty slot to add · hold a task to move it or open its menu
    </p>

    <CalendarTaskContextMenu
      v-if="contextMenuTask && contextMenuPos"
      :x="contextMenuPos.x"
      :y="contextMenuPos.y"
      :is-done="contextMenuTask.status === TASK_STATUS.DONE"
      @toggle-check="handleToggleTaskDone"
      @close="closeContextMenu"
    />

    <EventDetailsPanel
      v-if="selectedTask"
      :task="selectedTask"
      :project-options="projectOptions"
      :current-project-id="selectedProjectTemplateId"
      @close="closeDetails"
      @unschedule="handleUnschedule"
      @update-time="handleUpdateTime"
      @update-title="
        (payload) => emit('edit-task', payload.templateId, payload.title)
      "
      @update-project="
        (payload) =>
          emit('attach-to-project', payload.templateId, payload.projectTemplateId)
      "
    />
  </section>
</template>
