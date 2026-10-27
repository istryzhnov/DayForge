<script setup lang="ts">
import AppIcon from '../../../components/AppIcon.vue'
import { computed } from 'vue'
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
import CalendarFilterPopover from './CalendarFilterPopover.vue'
import EventDetailsPanel from './EventDetailsPanel.vue'
import {
  gridHeightPx,
  gridStyle,
  hourLineStyle,
  HOURS,
  pxPerMinute,
} from '../composables/useCalendarGrid'
import {
  useCalendarDayView,
  type CalendarViewMode,
} from '../composables/useCalendarDayView'
import { useCalendarWeek } from '../composables/useCalendarWeek'
import { useCalendarMonth } from '../composables/useCalendarMonth'
import { useTimer } from '../../../composables/useTimer'
import { toggleTaskTimer } from '../../timer/composables/useTaskTimerButton'
import { useCalendarNow } from '../composables/useCalendarNow'
import { useLogPlanned } from '../../../composables/useLogPlanned'
import { blockFromTask } from '../../../composables/timer/plannedBlocks'

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
  (e: 'edit-notes', templateId: ID, notes: string): void
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

const { isToday, nowTopPx } = useCalendarNow(() => props.currentDate)

const VIEW_MODES: { id: CalendarViewMode; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
]

// Week and month keep their own anchors, but the toolbar above them drives
// both, so the state lives here rather than inside the child views.
const week = useCalendarWeek({
  getTemplates: () => props.templates,
  getDailyTasks: () => props.dailyTasks,
  getCurrentDate: () => props.currentDate,
})

const month = useCalendarMonth({
  getTemplates: () => props.templates,
  getDailyTasks: () => props.dailyTasks,
  getCurrentDate: () => props.currentDate,
})

const periodTitle = computed(() => {
  if (viewMode.value === 'week') return week.weekLabel.value
  if (viewMode.value === 'month') return month.monthLabel.value
  return dateLabel.value
})

function goToPrevious() {
  if (viewMode.value === 'week') week.goToPreviousWeek()
  else if (viewMode.value === 'month') month.goToPreviousMonth()
  else emit('prev-day')
}

function goToNext() {
  if (viewMode.value === 'week') week.goToNextWeek()
  else if (viewMode.value === 'month') month.goToNextMonth()
  else emit('next-day')
}

function goToToday() {
  if (viewMode.value === 'week') week.goToThisWeek()
  else if (viewMode.value === 'month') month.goToTodayMonth()
  else emit('today')
}

const timer = useTimer()
const isContextTaskTiming = computed(
  () =>
    !!contextMenuTask.value &&
    timer.isActiveTask(contextMenuTask.value.templateId),
)

function toggleContextMenuTaskTimer() {
  const task = contextMenuTask.value
  if (!task) return
  toggleTaskTimer({
    taskId: task.templateId,
    taskTitle: task.title,
    goalId: task.goalId,
  })
}

const planned = useLogPlanned()

function canLogPlanned(task: DailyTask | null): boolean {
  return !!task && planned.canLog(blockFromTask(task))
}

function logPlannedFor(task: DailyTask | null) {
  if (task) planned.logBlock(blockFromTask(task))
}

/** Notes live on the task's template, not on the day row the panel shows. */
const selectedTaskNotes = computed(
  () =>
    props.templates.find(
      (template) => template.id === selectedTask.value?.templateId,
    )?.notes ?? '',
)

const goalIconById = computed(() => {
  const result: Record<ID, string> = {}
  props.goals.forEach((goal) => {
    if (goal.icon) result[goal.id] = goal.icon
  })
  return result
})

function iconFor(goalId: ID | undefined) {
  return goalId ? goalIconById.value[goalId] : undefined
}
</script>

<template>
  <section class="calendar-view" :class="{ 'is-touch': isCoarsePointer }">
    <!-- The time-blocking tip points here, not at the grid: the grid is a full
         day tall, so a bubble above or below it would sit over the toolbar. -->
    <header
      class="calendar-view__toolbar"
      :data-tip-anchor="viewMode === 'day' ? 'calendar-toolbar' : undefined"
    >
      <div class="calendar-view__nav">
        <button
          class="ui-icon-btn"
          type="button"
          :aria-label="`Previous ${viewMode}`"
          @click="goToPrevious"
        >
          <AppIcon name="chevron-left" :size="16" />
        </button>
        <button class="ui-chip" type="button" @click="goToToday">Today</button>
        <button
          class="ui-icon-btn"
          type="button"
          :aria-label="`Next ${viewMode}`"
          @click="goToNext"
        >
          <AppIcon name="chevron-right" :size="16" />
        </button>
        <h2 class="calendar-view__title ui-oneline">{{ periodTitle }}</h2>
      </div>

      <div class="calendar-view__views">
        <div class="ui-tabs" role="tablist" aria-label="Calendar view">
          <button
            v-for="mode in VIEW_MODES"
            :key="mode.id"
            class="ui-tab"
            :class="{ 'is-active': viewMode === mode.id }"
            type="button"
            role="tab"
            :aria-selected="viewMode === mode.id"
            @click="viewMode = mode.id"
          >
            {{ mode.label }}
          </button>
        </div>
        <CalendarFilterPopover :goals="goals" :goal-vars-by-id="goalVarsById" />
      </div>
    </header>

    <CalendarWeekView
      v-if="viewMode === 'week'"
      :week="week"
      :current-date="currentDate"
      :goal-vars-by-id="goalVarsById"
      :goal-icon-by-id="goalIconById"
      @open-day="openDay"
    />

    <CalendarMonthView
      v-else-if="viewMode === 'month'"
      :month="month"
      :current-date="currentDate"
      :goal-vars-by-id="goalVarsById"
      :goal-icon-by-id="goalIconById"
      @open-day="openDay"
    />

    <template v-else>
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

            <template v-if="isToday">
              <div
                class="cal-past-shade"
                :style="{ height: `${nowTopPx}px` }"
              ></div>
              <div class="cal-now-line" :style="{ top: `${nowTopPx}px` }"></div>
            </template>

            <CalendarEventBlock
              v-for="task in scheduledTasks"
              :key="task.id"
              :task="task"
              :top-px="topPxFor(task)"
              :height-px="heightPxFor(task)"
              :is-dragging="draggingTaskId === task.id"
              :theme-vars="themeVarsFor(task.goalId)"
              :icon="iconFor(task.goalId)"
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

        <aside ref="unscheduledRef" class="ui-card calendar-view__unscheduled">
          <div class="calendar-view__unscheduled-head">
            <p class="ui-section-label">Unscheduled</p>
            <span class="calendar-view__unscheduled-count">
              {{ unscheduledTasks.length }}
            </span>
          </div>
          <CalendarUnscheduledItem
            v-for="task in unscheduledTasks"
            :key="task.id"
            :task="task"
            :theme-vars="themeVarsFor(task.goalId)"
            :icon="iconFor(task.goalId)"
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

      <p v-if="isCoarsePointer" class="calendar-view__touch-hint ui-oneline">
        Tap an empty slot to add · hold a task to move it or open its menu
      </p>

      <CalendarTaskContextMenu
        v-if="contextMenuTask && contextMenuPos"
        :x="contextMenuPos.x"
        :y="contextMenuPos.y"
        :is-done="contextMenuTask.status === TASK_STATUS.DONE"
        :is-timer-active="isContextTaskTiming"
        :can-log-planned="canLogPlanned(contextMenuTask)"
        :can-unschedule="contextMenuTask.startTime !== undefined"
        @toggle-check="toggleContextMenuTaskDone"
        @toggle-timer="toggleContextMenuTaskTimer"
        @log-planned="logPlannedFor(contextMenuTask)"
        @unschedule="unscheduleAndClose(contextMenuTask.id)"
        @close="closeContextMenu"
      />

      <EventDetailsPanel
        v-if="selectedTask"
        :task="selectedTask"
        :project-options="projectOptions"
        :current-project-id="selectedProjectTemplateId"
        :goals="goals"
        :current-goal-id="selectedTask.goalId ?? null"
        :notes="selectedTaskNotes"
        :can-log-planned="canLogPlanned(selectedTask)"
        @log-planned="logPlannedFor(selectedTask)"
        @close="closeDetails"
        @unschedule="unscheduleAndClose"
        @update-time="updateTimeAndClose"
        @update-title="
          (payload) => emit('edit-task', payload.templateId, payload.title)
        "
        @update-notes="
          (payload) => emit('edit-notes', payload.templateId, payload.notes)
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
