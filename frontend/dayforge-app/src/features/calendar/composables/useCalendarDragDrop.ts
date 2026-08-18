import { computed, ref } from 'vue'
import type { DailyTask } from '../../../entities/TaskEntity'
import type { ID } from '../../../entities/types'
import type { GesturePoint } from '../../../composables/usePressGesture'
import {
  clampMinutes,
  durationMinutes,
  minutesFromClientY,
  minutesFromDayStart,
  timeFromMinutes,
} from './useCalendarGrid'

export type SchedulePayload = {
  taskId: ID
  startTime: string
  endTime: string
}

export type TouchDragPreview = {
  taskId: ID
  startMin: number
  durationMin: number
  /** Task had no time yet — the view renders a floating preview block for it. */
  isNewlyScheduled: boolean
}

type DragDropOptions = {
  getGridElement: () => HTMLElement | null
  findTask: (taskId: ID) => DailyTask | undefined
  onSchedule: (payload: SchedulePayload) => void
}

/** Distance from a viewport edge (px) that starts auto-scrolling during a drag. */
const AUTO_SCROLL_EDGE_PX = 72
const AUTO_SCROLL_STEP_PX = 12

/**
 * Owns both drag-and-drop paths for the day grid:
 *
 * - desktop: HTML5 native drag events (`dragstart`/`dragover`/`drop`)
 * - touch: pointer-driven dragging fed by `usePressGesture`
 *
 * Both funnel into the same `scheduleAt` so a task lands identically however it
 * was moved. Kept out of the component so the view only wires handlers up.
 */
export function useCalendarDragDrop(options: DragDropOptions) {
  const grabOffsetMinutes = ref(0)
  const touchDrag = ref<TouchDragPreview | null>(null)

  let autoScrollTimerId: number | undefined

  function scheduleAt(task: DailyTask, startMin: number) {
    const duration = durationMinutes(task.startTime, task.endTime)
    const endMin = clampMinutes(startMin + duration)

    options.onSchedule({
      taskId: task.id,
      startTime: timeFromMinutes(startMin),
      endTime: timeFromMinutes(endMin),
    })
  }

  // --- desktop: native HTML5 drag and drop -------------------------------

  function onDragStartFromList(event: DragEvent, taskId: ID) {
    event.dataTransfer?.setData('text/plain', taskId)
    grabOffsetMinutes.value = 0
  }

  function onBlockDragStart(payload: {
    taskId: ID
    grabOffsetMinutes: number
  }) {
    grabOffsetMinutes.value = payload.grabOffsetMinutes
  }

  function onGridDragOver(event: DragEvent) {
    event.preventDefault()
  }

  function onGridDrop(event: DragEvent) {
    event.preventDefault()

    const taskId = event.dataTransfer?.getData('text/plain') as ID | undefined
    const grid = options.getGridElement()
    if (!taskId || !grid) return

    const task = options.findTask(taskId)
    if (!task) return

    scheduleAt(
      task,
      minutesFromClientY(grid, event.clientY, grabOffsetMinutes.value),
    )
  }

  // --- touch: pointer-driven drag ----------------------------------------

  function stopAutoScroll() {
    if (autoScrollTimerId !== undefined) {
      window.clearInterval(autoScrollTimerId)
      autoScrollTimerId = undefined
    }
  }

  /**
   * The day grid is taller than a phone screen, so a drag has to be able to
   * reach times that are off-screen. Holding near the top/bottom edge scrolls
   * the page and keeps the preview following the finger's new grid position.
   */
  function updateAutoScroll(point: GesturePoint) {
    stopAutoScroll()

    const distanceFromTop = point.y
    const distanceFromBottom = window.innerHeight - point.y

    let direction = 0
    if (distanceFromTop < AUTO_SCROLL_EDGE_PX) direction = -1
    else if (distanceFromBottom < AUTO_SCROLL_EDGE_PX) direction = 1
    if (direction === 0) return

    autoScrollTimerId = window.setInterval(() => {
      window.scrollBy(0, direction * AUTO_SCROLL_STEP_PX)
      // Re-project the (unchanged) finger position onto the scrolled grid.
      applyPreview(point)
    }, 16)
  }

  function applyPreview(point: GesturePoint) {
    const grid = options.getGridElement()
    const current = touchDrag.value
    if (!grid || !current) return

    current.startMin = minutesFromClientY(
      grid,
      point.y,
      grabOffsetMinutes.value,
    )
  }

  function beginTouchDrag(taskId: ID, offsetMinutes: number) {
    const task = options.findTask(taskId)
    if (!task) return

    grabOffsetMinutes.value = offsetMinutes

    touchDrag.value = {
      taskId,
      startMin: task.startTime
        ? minutesFromDayStart(task.startTime)
        : clampMinutes(0),
      durationMin: durationMinutes(task.startTime, task.endTime),
      isNewlyScheduled: !task.startTime,
    }
  }

  function updateTouchDrag(point: GesturePoint) {
    if (!touchDrag.value) return
    applyPreview(point)
    updateAutoScroll(point)
  }

  function endTouchDrag(point: GesturePoint) {
    const current = touchDrag.value
    stopAutoScroll()
    if (!current) return

    applyPreview(point)
    const startMin = touchDrag.value?.startMin ?? current.startMin
    const task = options.findTask(current.taskId)

    touchDrag.value = null
    if (task) scheduleAt(task, startMin)
  }

  function cancelTouchDrag() {
    stopAutoScroll()
    touchDrag.value = null
  }

  const draggingTaskId = computed(() => touchDrag.value?.taskId ?? null)

  return {
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
  }
}
