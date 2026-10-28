<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DailyTask } from '../../../entities/TaskEntity'
import type { ID } from '../../../entities/types'
import type { GesturePoint } from '../../../composables/usePressGesture'
import { useCalendarEventBlock } from '../composables/useCalendarEventBlock'
import ProjectIcon from '../../goals/components/ProjectIcon.vue'
import { isOvernight } from '../../../composables/goalSpace/overnight'

/** Below this height the icon would crowd out the title, so it is dropped. */
const MIN_ICON_HEIGHT_PX = 28

const props = defineProps<{
  task: DailyTask
  /** The tail of a block that started the day before. */
  isTail?: boolean
  topPx: number
  heightPx: number
  isDragging?: boolean
  /** Its project's colours, when the project has its own. */
  themeVars?: Record<string, string>
  /** The project's icon id, drawn before the title. */
  icon?: string
  /** Left/width once overlapping blocks have been split into columns. */
  columnStyle?: Record<string, string>
}>()

const { t } = useI18n()

const emit = defineEmits<{
  (e: 'select', taskId: ID): void
  (e: 'drag-start', payload: { taskId: ID; grabOffsetMinutes: number }): void
  (e: 'resize', payload: { taskId: ID; endTime: string }): void
  (e: 'context-menu', payload: { taskId: ID; x: number; y: number }): void
  (e: 'touch-lift', payload: { taskId: ID; grabOffsetMinutes: number }): void
  (e: 'touch-move', point: GesturePoint): void
  (e: 'touch-drop', point: GesturePoint): void
  (e: 'touch-cancel'): void
}>()

const {
  isDone,
  isResizing,
  isLifted,
  isDraggable,
  formatTime,
  blockStyle,
  onPointerDown,
  onDragStart,
  onContextMenu,
  onResizeHandleDown,
} = useCalendarEventBlock(props, {
  onDragStart: (payload) => emit('drag-start', payload),
  onResize: (payload) => emit('resize', payload),
  onContextMenu: (payload) => emit('context-menu', payload),
  onTouchLift: (payload) => emit('touch-lift', payload),
  onTouchMove: (point) => emit('touch-move', point),
  onTouchDrop: (point) => emit('touch-drop', point),
  onTouchCancel: () => emit('touch-cancel'),
})

/** A block past midnight says so; its tail says when it ends. */
const timeLabel = computed(() => {
  const { startTime, endTime } = props.task
  if (props.isTail) {
    return t('tasks.untilTime', { time: formatTime(endTime) })
  }
  const range = `${formatTime(startTime)}–${formatTime(endTime)}`
  return isOvernight(startTime, endTime)
    ? `${range} ${t('tasks.nextDay')}`
    : range
})
</script>

<template>
  <div
    ref="blockRef"
    class="cal-event"
    :class="[
      task.priority,
      {
        'is-done': isDone,
        'is-resizing': isResizing,
        'is-lifted': isLifted,
        'is-dragging': isDragging,
        'is-tail': isTail,
      },
    ]"
    :style="blockStyle(topPx, heightPx)"
    :draggable="isDraggable"
    role="button"
    tabindex="0"
    aria-haspopup="dialog"
    :aria-label="`${task.title}, ${timeLabel}`"
    @dragstart="onDragStart"
    @pointerdown="onPointerDown"
    @click="emit('select', task.id)"
    @keydown.enter.prevent="emit('select', task.id)"
    @keydown.space.prevent="emit('select', task.id)"
    @contextmenu.prevent="onContextMenu"
  >
    <span class="cal-event__time">{{ timeLabel }}</span>
    <ProjectIcon
      v-if="icon && heightPx >= MIN_ICON_HEIGHT_PX"
      class="cal-event__icon"
      :icon="icon"
    />
    <span class="cal-event__title">{{ task.title }}</span>
    <div
      v-if="!isTail"
      class="cal-event__resize-handle"
      @pointerdown="onResizeHandleDown"
      @click.stop
    ></div>
  </div>
</template>
