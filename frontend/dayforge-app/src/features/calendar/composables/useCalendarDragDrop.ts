import { computed, ref } from 'vue'
import type { DailyTask } from '../../../entities/TaskEntity'
import type { ID, ISODate } from '../../../entities/types'
import type { GesturePoint } from '../../../composables/usePressGesture'
import { tourEvent } from '../../onboarding/composables/useTour'
import {
  clampMinutes,
  durationMinutes,
  minutesFromClientY,
  minutesFromDayStart,
  timeFromMinutes,
} from './useCalendarGrid'
import { MINUTES_PER_DAY } from '../../../composables/goalSpace/overnight'

export type SchedulePayload = {
  taskId: ID
  startTime: string
  endTime: string
  /** The day on screen, which a task from another day is moved to. */
  date?: ISODate
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
  /** The unscheduled panel, which takes a block back when it is dropped there. */
  getUnscheduledElement: () => HTMLElement | null
  getCurrentDate: () => ISODate
  findTask: (taskId: ID) => DailyTask | undefined
  onSchedule: (payload: SchedulePayload) => void
  onUnschedule: (taskId: ID) => void
  getBottomInset?: () => number
}

/** Distance from a viewport edge (px) that starts auto-scrolling during a drag. */
const AUTO_SCROLL_EDGE_PX = 72
const AUTO_SCROLL_STEP_PX = 12

function pointIsOver(element: HTMLElement | null, point: GesturePoint) {
  if (!element) return false
  const rect = element.getBoundingClientRect()
  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  )
}

export function useCalendarDragDrop(options: DragDropOptions) {
  const grabOffsetMinutes = ref(0)
  const touchDrag = ref<TouchDragPreview | null>(null)
  /** A block is hovering the unscheduled panel, which lights up to take it. */
  const isOverUnscheduled = ref(false)
  /** The native drag in progress is a block, not a row from the unscheduled list. */
  let isBlockDrag = false

  let autoScrollTimerId: number | undefined

  function scheduleAt(task: DailyTask, startMin: number) {
    const duration = durationMinutes(task.startTime, task.endTime)
    // A block dragged past midnight wraps, so its end lands on the next day.
    const endMin = (startMin + duration) % MINUTES_PER_DAY

    options.onSchedule({
      taskId: task.id,
      startTime: timeFromMinutes(startMin),
      endTime: timeFromMinutes(endMin),
      date: options.getCurrentDate(),
    })
    // A task with no time yet came from Unscheduled; a block being moved already had one.
    tourEvent('task-timed', { taskId: task.id, fromList: !task.startTime })
  }

  // --- desktop: native HTML5 drag and drop -------------------------------

  function onDragStartFromList(event: DragEvent, taskId: ID) {
    event.dataTransfer?.setData('text/plain', taskId)
    grabOffsetMinutes.value = 0
    isBlockDrag = false
  }

  function onBlockDragStart(payload: {
    taskId: ID
    grabOffsetMinutes: number
  }) {
    grabOffsetMinutes.value = payload.grabOffsetMinutes
    isBlockDrag = true
  }

  function onGridDragOver(event: DragEvent) {
    event.preventDefault()
  }

  /** Only a block can be dropped back on Unscheduled; a list row is refused. */
  function onUnscheduledDragOver(event: DragEvent) {
    if (!isBlockDrag) return
    event.preventDefault()
    isOverUnscheduled.value = true
  }

  function onUnscheduledDragLeave(event: DragEvent) {
    const panel = event.currentTarget as HTMLElement
    // Moving between the panel's own children is not leaving it.
    if (
      event.relatedTarget instanceof Node &&
      panel.contains(event.relatedTarget)
    ) {
      return
    }
    isOverUnscheduled.value = false
  }

  function onUnscheduledDrop(event: DragEvent) {
    event.preventDefault()
    isOverUnscheduled.value = false
    if (!isBlockDrag) return

    const taskId = event.dataTransfer?.getData('text/plain') as ID | undefined
    if (taskId) options.onUnschedule(taskId)
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

  function updateAutoScroll(point: GesturePoint) {
    stopAutoScroll()

    const bottomInset = options.getBottomInset?.() ?? 0
    const distanceFromTop = point.y
    const distanceFromBottom = window.innerHeight - bottomInset - point.y

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
    isOverUnscheduled.value =
      !touchDrag.value.isNewlyScheduled &&
      pointIsOver(options.getUnscheduledElement(), point)
  }

  function endTouchDrag(point: GesturePoint) {
    const current = touchDrag.value
    stopAutoScroll()
    isOverUnscheduled.value = false
    if (!current) return

    // Released over Unscheduled: a block goes back there, a list row stays put.
    if (pointIsOver(options.getUnscheduledElement(), point)) {
      touchDrag.value = null
      if (!current.isNewlyScheduled) options.onUnschedule(current.taskId)
      return
    }

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
    isOverUnscheduled,
    onDragStartFromList,
    onBlockDragStart,
    onGridDragOver,
    onGridDrop,
    onUnscheduledDragOver,
    onUnscheduledDragLeave,
    onUnscheduledDrop,
    beginTouchDrag,
    updateTouchDrag,
    endTouchDrag,
    cancelTouchDrag,
  }
}
