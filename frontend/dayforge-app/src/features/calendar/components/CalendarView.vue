<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DailyTask } from '../../../entities/TaskEntity'
import type { ID, ISODate } from '../../../entities/types'
import CalendarEventBlock from './CalendarEventBlock.vue'
import EventDetailsPanel from './EventDetailsPanel.vue'
import {
  DAY_START_HOUR,
  DEFAULT_DURATION_MINUTES,
  GRID_HEIGHT_PX,
  HOURS,
  PX_PER_MINUTE,
  clampMinutes,
  minutesFromDayStart,
  snapMinutes,
  timeFromMinutes,
} from '../composables/useCalendarGrid'

const props = defineProps<{
  tasks: DailyTask[]
  currentDate: ISODate
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
}>()

const gridRef = ref<HTMLElement | null>(null)
const selectedTaskId = ref<ID | null>(null)

const scheduledTasks = computed(() =>
  props.tasks.filter((t) => t.startTime && t.endTime),
)
const unscheduledTasks = computed(() => props.tasks.filter((t) => !t.startTime))
const selectedTask = computed(
  () => props.tasks.find((t) => t.id === selectedTaskId.value) ?? null,
)

const dateLabel = computed(() =>
  new Date(`${props.currentDate}T00:00:00`).toLocaleDateString('uk-UA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }),
)

function blockGeometry(task: DailyTask) {
  const startMin = minutesFromDayStart(task.startTime!)
  const endMin = minutesFromDayStart(task.endTime!)
  return {
    top: startMin * PX_PER_MINUTE,
    height: (endMin - startMin) * PX_PER_MINUTE,
  }
}

// --- create a new interval by dragging on empty grid ---
const draftRange = ref<{ startMin: number; endMin: number } | null>(null)
const showDraftForm = ref(false)
const draftTitle = ref('')
let isCreating = false

function pointerYToMinutes(event: PointerEvent): number {
  const rect = gridRef.value!.getBoundingClientRect()
  return clampMinutes(snapMinutes(event.clientY - rect.top))
}

function onGridPointerDown(event: PointerEvent) {
  if (event.target !== gridRef.value) return
  const startMin = pointerYToMinutes(event)
  isCreating = true
  draftRange.value = { startMin, endMin: startMin + DEFAULT_DURATION_MINUTES }
  window.addEventListener('pointermove', onGridPointerMove)
  window.addEventListener('pointerup', onGridPointerUp)
}

function onGridPointerMove(event: PointerEvent) {
  if (!isCreating || !draftRange.value) return
  const min = pointerYToMinutes(event)
  draftRange.value.endMin = Math.max(min, draftRange.value.startMin + 15)
}

function onGridPointerUp() {
  window.removeEventListener('pointermove', onGridPointerMove)
  window.removeEventListener('pointerup', onGridPointerUp)
  isCreating = false
  if (draftRange.value) {
    draftTitle.value = ''
    showDraftForm.value = true
  }
}

function submitDraft() {
  const title = draftTitle.value.trim()
  if (draftRange.value && title) {
    emit('create-task', {
      title,
      startTime: timeFromMinutes(draftRange.value.startMin),
      endTime: timeFromMinutes(draftRange.value.endMin),
    })
  }
  cancelDraft()
}

function cancelDraft() {
  draftRange.value = null
  showDraftForm.value = false
  draftTitle.value = ''
}

function draftStyle() {
  if (!draftRange.value) return {}
  return {
    top: `${draftRange.value.startMin * PX_PER_MINUTE}px`,
    height: `${(draftRange.value.endMin - draftRange.value.startMin) * PX_PER_MINUTE}px`,
  }
}

// --- drag an existing/unscheduled task onto the grid ---
const dragGrabOffsetMinutes = ref(0)

function onDragStartFromList(event: DragEvent, taskId: ID) {
  event.dataTransfer?.setData('text/plain', taskId)
  dragGrabOffsetMinutes.value = 0
}

function onBlockDragStart(payload: { taskId: ID; grabOffsetMinutes: number }) {
  dragGrabOffsetMinutes.value = payload.grabOffsetMinutes
}

function onGridDragOver(event: DragEvent) {
  event.preventDefault()
}

function onGridDrop(event: DragEvent) {
  event.preventDefault()
  const taskId = event.dataTransfer?.getData('text/plain') as ID | undefined
  if (!taskId) return
  const task = props.tasks.find((t) => t.id === taskId)
  if (!task) return

  const rect = gridRef.value!.getBoundingClientRect()
  const dropMin = clampMinutes(
    snapMinutes(event.clientY - rect.top - dragGrabOffsetMinutes.value),
  )
  const duration =
    task.startTime && task.endTime
      ? minutesFromDayStart(task.endTime) - minutesFromDayStart(task.startTime)
      : DEFAULT_DURATION_MINUTES
  const endMin = clampMinutes(dropMin + duration)

  emit('schedule-task', {
    taskId: task.id,
    startTime: timeFromMinutes(dropMin),
    endTime: timeFromMinutes(endMin),
  })
}

function onResize(payload: { taskId: ID; endTime: string }) {
  const task = props.tasks.find((t) => t.id === payload.taskId)
  if (!task?.startTime) return
  emit('schedule-task', {
    taskId: task.id,
    startTime: task.startTime,
    endTime: payload.endTime,
  })
}

function openDetails(taskId: ID) {
  selectedTaskId.value = taskId
}

function closeDetails() {
  selectedTaskId.value = null
}

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

function hourLineTop(hour: number) {
  return { top: `${(hour - DAY_START_HOUR) * 60 * PX_PER_MINUTE}px` }
}
</script>

<template>
  <section class="calendar-view">
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
          :style="{ height: `${GRID_HEIGHT_PX}px` }"
          @pointerdown="onGridPointerDown"
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
            :top-px="blockGeometry(task).top"
            :height-px="blockGeometry(task).height"
            @select="openDetails"
            @drag-start="onBlockDragStart"
            @resize="onResize"
          />

          <div
            v-if="draftRange"
            class="calendar-view__draft"
            :style="draftStyle()"
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

      <aside class="calendar-view__unscheduled">
        <p class="sidebar-caption">Unscheduled</p>
        <div
          v-for="task in unscheduledTasks"
          :key="task.id"
          class="calendar-view__unscheduled-item"
          :class="task.priority"
          draggable="true"
          @dragstart="onDragStartFromList($event, task.id)"
        >
          {{ task.title }}
        </div>
        <p v-if="!unscheduledTasks.length" class="calendar-view__empty-hint">
          All tasks are scheduled
        </p>
      </aside>
    </div>

    <EventDetailsPanel
      v-if="selectedTask"
      :task="selectedTask"
      @close="closeDetails"
      @unschedule="handleUnschedule"
      @update-time="handleUpdateTime"
    />
  </section>
</template>
