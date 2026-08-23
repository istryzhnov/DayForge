<script setup lang="ts">
import type {
  DailyTask,
  MajorTaskOption,
  TaskTemplate,
} from '../../../entities/TaskEntity'
import type { Goal } from '../../../entities/GoalEntity'
import type { ID, ISODate } from '../../../entities/types'
import { TASK_STATUS } from '../../../entities/constants'
import CalendarMonthView from './CalendarMonthView.vue'
import CalendarWeekView from './CalendarWeekView.vue'
import CalendarEventBlock from './CalendarEventBlock.vue'
import CalendarTaskContextMenu from './CalendarTaskContextMenu.vue'
import CalendarUnscheduledItem from './CalendarUnscheduledItem.vue'
import EventDetailsPanel from './EventDetailsPanel.vue'
import {
  gridHeightPx,
  gridStyle,
  hourLineStyle,
  HOURS,
  pxPerMinute,
} from '../composables/useCalendarGrid'
import { useCalendarDayView } from '../composables/useCalendarDayView'

const props = defineProps<{
  tasks: DailyTask[]
  currentDate: ISODate
  projectOptions: MajorTaskOption[]
  /** Whole-history rows and rules — the month view projects from both. */
  dailyTasks: DailyTask[]
  templates: TaskTemplate[]
  goals: Goal[]
  /** Per-project colours, keyed by goal id. */
  goalVarsById: Record<ID, Record<string, string>>
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
  (e: 'assign-goal', templateId: ID, goalId: ID | undefined): void
  (e: 'select-date', date: ISODate): void
}>()

const {
  viewMode,
  isCoarsePointer,
  openDay,
  dateLabel,
  scheduledTasks,
  unscheduledTasks,
  incomingPreview,
  selectedProjectTemplateId,
  selectedTask,
  contextMenuTask,
  contextMenuPos,
  openDetails,
  closeDetails,
  openContextMenu,
  closeContextMenu,
  touchDrag,
  draggingTaskId,
  onDragStartFromList,
  onBlockDragStart,
  onGridDragOver,
  onGridDrop,
  cancelTouchDrag,
  draftRange,
  showDraftForm,
  draftTitle,
  onGridPointerDown,
  submitDraft,
  cancelDraft,
  topPxFor,
  heightPxFor,
  columnStyleFor,
  previewStyle,
  themeVarsFor,
  onBlockTouchLift,
  onUnscheduledTouchLift,
  onTouchMove,
  onTouchDrop,
  onResize,
  onGridClick,
  toggleContextMenuTaskDone,
  unscheduleAndClose,
  updateTimeAndClose,
} = useCalendarDayView(props, {
  onSchedule: (payload) => emit('schedule-task', payload),
  onUnschedule: (taskId) => emit('unschedule-task', taskId),
  onCreate: (payload) => emit('create-task', payload),
  onToggleDone: (taskId) => emit('toggle-task-done', taskId),
  onSelectDate: (date) => emit('select-date', date),
})
</script>

<template>
  <section class="calendar-view" :class="{ 'is-touch': isCoarsePointer }">
    <div class="calendar-view__modes">
      <button
        class="theme-chip"
        :class="{ active: viewMode === 'day' }"
        type="button"
        @click="viewMode = 'day'"
      >
        Day
      </button>
      <button
        class="theme-chip"
        :class="{ active: viewMode === 'week' }"
        type="button"
        @click="viewMode = 'week'"
      >
        Week
      </button>
      <button
        class="theme-chip"
        :class="{ active: viewMode === 'month' }"
        type="button"
        @click="viewMode = 'month'"
      >
        Month
      </button>
    </div>

    <CalendarWeekView
      v-if="viewMode === 'week'"
      :templates="templates"
      :daily-tasks="dailyTasks"
      :current-date="currentDate"
      :goal-vars-by-id="goalVarsById"
      @open-day="openDay"
    />

    <CalendarMonthView
      v-else-if="viewMode === 'month'"
      :templates="templates"
      :daily-tasks="dailyTasks"
      :current-date="currentDate"
      :goal-vars-by-id="goalVarsById"
      @open-day="openDay"
    />

    <template v-else>
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
            :style="gridStyle(gridHeightPx)"
            @pointerdown="onGridPointerDown"
            @click="onGridClick"
            @dragover="onGridDragOver"
            @drop="onGridDrop"
          >
            <div
              v-for="hour in HOURS"
              :key="hour"
              class="calendar-view__hour-line"
              :style="hourLineStyle(hour)"
            ></div>

            <CalendarEventBlock
              v-for="task in scheduledTasks"
              :key="task.id"
              :task="task"
              :top-px="topPxFor(task)"
              :height-px="heightPxFor(task)"
              :is-dragging="draggingTaskId === task.id"
              :theme-vars="themeVarsFor(task.goalId)"
              :column-style="columnStyleFor(task)"
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
                  draftRange.startMin * pxPerMinute(),
                  (draftRange.endMin - draftRange.startMin) * pxPerMinute(),
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
                  <button
                    type="button"
                    class="btn btn-ghost"
                    @click="cancelDraft"
                  >
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
            :theme-vars="themeVarsFor(task.goalId)"
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
        @toggle-check="toggleContextMenuTaskDone"
        @close="closeContextMenu"
      />

      <EventDetailsPanel
        v-if="selectedTask"
        :task="selectedTask"
        :project-options="projectOptions"
        :current-project-id="selectedProjectTemplateId"
        :goals="goals"
        :current-goal-id="selectedTask.goalId ?? null"
        @close="closeDetails"
        @unschedule="unscheduleAndClose"
        @update-time="updateTimeAndClose"
        @update-title="
          (payload) => emit('edit-task', payload.templateId, payload.title)
        "
        @update-goal="
          (payload) => emit('assign-goal', payload.templateId, payload.goalId)
        "
        @update-project="
          (payload) =>
            emit(
              'attach-to-project',
              payload.templateId,
              payload.projectTemplateId,
            )
        "
      />
    </template>
  </section>
</template>
