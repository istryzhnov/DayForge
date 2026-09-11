import { computed, ref, useTemplateRef } from 'vue'
import type { DailyTask } from '../../../entities/TaskEntity'
import type { ID, ISODate } from '../../../entities/types'
import { PRIORITY, TASK_STATUS } from '../../../entities/constants'
import { useIsCoarsePointer } from '../../../composables/useMediaQuery'
import { useFormat } from '../../../composables/useFormat'
import type { GesturePoint } from '../../../composables/usePressGesture'
import {
  columnStyle,
  minutesFromDayStart,
  pxPerMinute,
} from './useCalendarGrid'
import { layoutOverlaps } from './overlapLayout'
import { useCalendarDragDrop } from './useCalendarDragDrop'
import { useCalendarDraft } from './useCalendarDraft'
import { useCalendarSelection } from './useCalendarSelection'

/** The breathing room the day strip keeps on both sides. */
const GRID_INSET_PX = 6

export type CalendarViewMode = 'day' | 'week' | 'month'

type DayViewProps = {
  tasks: DailyTask[]
  currentDate: ISODate
  goalVarsById: Record<ID, Record<string, string>>
}

type DayViewActions = {
  onSchedule: (payload: {
    taskId: ID
    startTime: string
    endTime: string
  }) => void
  onUnschedule: (taskId: ID) => void
  onCreate: (payload: {
    title: string
    startTime: string
    endTime: string
  }) => void
  onToggleDone: (taskId: ID) => void
  onSelectDate: (date: ISODate) => void
}

export function useCalendarDayView(
  props: DayViewProps,
  actions: DayViewActions,
) {
  const viewMode = ref<CalendarViewMode>('day')
  const gridRef = useTemplateRef<HTMLElement>('gridRef')
  const unscheduledRef = useTemplateRef<HTMLElement>('unscheduledRef')
  const isCoarsePointer = useIsCoarsePointer()
  const { formatDate } = useFormat()

  /** Clicking a day in the week or month view opens it in the day view. */
  function openDay(date: ISODate) {
    actions.onSelectDate(date)
    viewMode.value = 'day'
  }

  function bottomInset() {
    if (!isCoarsePointer.value) return 0
    const element = unscheduledRef.value
    if (!element || getComputedStyle(element).position !== 'fixed') return 0
    return element.getBoundingClientRect().height
  }

  const dateLabel = computed(() => formatDate(props.currentDate))

  const scheduledTasks = computed(() =>
    props.tasks.filter((task) => task.startTime && task.endTime),
  )

  const unscheduledTasks = computed(() =>
    props.tasks.filter(
      (task) =>
        !task.startTime &&
        task.priority !== PRIORITY.MAJOR &&
        task.status !== TASK_STATUS.DONE,
    ),
  )

  const selection = useCalendarSelection({ getTasks: () => props.tasks })

  const dragDrop = useCalendarDragDrop({
    getGridElement: () => gridRef.value,
    findTask: (taskId) => props.tasks.find((task) => task.id === taskId),
    onSchedule: actions.onSchedule,
    getBottomInset: bottomInset,
  })

  const draft = useCalendarDraft({
    getGridElement: () => gridRef.value,
    isCoarsePointer: () => isCoarsePointer.value,
    // A tap that dismisses an open menu shouldn't also start a new task.
    canStartDraft: () => !selection.isContextMenuOpen.value,
    onCreate: actions.onCreate,
  })

  // --- geometry -----------------------------------------------------------

  /** The dragged task previews at the finger's position, not its stored time. */
  function topPxFor(task: DailyTask) {
    const preview = dragDrop.touchDrag.value
    const startMin =
      preview?.taskId === task.id
        ? preview.startMin
        : minutesFromDayStart(task.startTime!)
    return startMin * pxPerMinute()
  }

  function heightPxFor(task: DailyTask) {
    const startMin = minutesFromDayStart(task.startTime!)
    const endMin = minutesFromDayStart(task.endTime!)
    return (endMin - startMin) * pxPerMinute()
  }

  const overlapSlots = computed(() =>
    layoutOverlaps(
      scheduledTasks.value.map((task) => ({
        id: task.id,
        startMin: minutesFromDayStart(task.startTime!),
        endMin: minutesFromDayStart(task.endTime!),
      })),
    ),
  )

  function columnStyleFor(task: DailyTask) {
    return columnStyle(overlapSlots.value.get(task.id), GRID_INSET_PX)
  }

  function previewStyle(top: number, height: number) {
    return { top: `${top}px`, height: `${Math.max(height, 20)}px` }
  }

  /** A task carries its project's colour onto the grid. */
  function themeVarsFor(goalId: ID | undefined) {
    return goalId ? props.goalVarsById[goalId] : undefined
  }

  /** An unscheduled task being dragged in has no block yet, so float a preview. */
  const incomingPreview = computed(() => {
    const preview = dragDrop.touchDrag.value
    if (!preview?.isNewlyScheduled) return null

    const task = props.tasks.find((item) => item.id === preview.taskId)
    if (!task) return null

    return {
      title: task.title,
      priority: task.priority,
      top: preview.startMin * pxPerMinute(),
      height: preview.durationMin * pxPerMinute(),
    }
  })

  // --- event handling -----------------------------------------------------

  function onBlockTouchLift(payload: {
    taskId: ID
    grabOffsetMinutes: number
  }) {
    selection.closeContextMenu()
    dragDrop.beginTouchDrag(payload.taskId, payload.grabOffsetMinutes)
  }

  function onUnscheduledTouchLift(taskId: ID) {
    selection.closeContextMenu()
    dragDrop.beginTouchDrag(taskId, 0)
  }

  function onTouchMove(point: GesturePoint) {
    dragDrop.updateTouchDrag(point)
  }

  function onTouchDrop(point: GesturePoint) {
    dragDrop.endTouchDrag(point)
  }

  /** Resizing only moves the end, so the stored start is sent back unchanged. */
  function onResize(payload: { taskId: ID; endTime: string }) {
    const task = props.tasks.find((item) => item.id === payload.taskId)
    if (!task?.startTime) return
    actions.onSchedule({
      taskId: task.id,
      startTime: task.startTime,
      endTime: payload.endTime,
    })
  }

  function onGridClick(event: MouseEvent) {
    if (selection.isContextMenuOpen.value) {
      selection.closeContextMenu()
      return
    }
    draft.onGridTap(event)
  }

  function toggleContextMenuTaskDone() {
    const taskId = selection.contextMenuTask.value?.id
    if (taskId) actions.onToggleDone(taskId)
  }

  function unscheduleAndClose(taskId: ID) {
    actions.onUnschedule(taskId)
    selection.closeDetails()
  }

  function updateTimeAndClose(payload: {
    taskId: ID
    startTime: string
    endTime: string
  }) {
    actions.onSchedule(payload)
    selection.closeDetails()
  }

  /** The select works in template ids, but a row only stores its parent row id. */
  const selectedProjectTemplateId = computed(() => {
    const parentRowId = selection.selectedTask.value?.parentDailyTaskId
    if (!parentRowId) return null
    return (
      props.tasks.find((task) => task.id === parentRowId)?.templateId ?? null
    )
  })

  return {
    viewMode,
    isCoarsePointer,
    openDay,
    dateLabel,
    scheduledTasks,
    unscheduledTasks,
    incomingPreview,
    selectedProjectTemplateId,
    ...selection,
    ...dragDrop,
    ...draft,
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
  }
}
