import { ref } from 'vue'

export type GesturePoint = { x: number; y: number }

export type PressGestureOptions = {
  /** Hold duration before the item is "lifted" and the gesture takes over. */
  longPressMs?: number
  /** Movement (px) before the lift that aborts the gesture and lets the page scroll. */
  moveTolerancePx?: number
  /** Gate the whole gesture (e.g. touch-only). Checked on pointerdown. */
  isEnabled?: () => boolean
  /** Long-press threshold reached — the item is picked up. */
  onLift?: (point: GesturePoint) => void
  /** Pointer moved while lifted. */
  onDragMove?: (point: GesturePoint) => void
  /** Released after having moved while lifted — this is a drop. */
  onDrop?: (point: GesturePoint) => void
  /** Released without moving after the lift — treat as a context-menu request. */
  onLongPress?: (point: GesturePoint) => void
  /** Gesture aborted (scrolled away, pointer cancelled). */
  onCancel?: () => void
}

const DEFAULT_LONG_PRESS_MS = 350
const DEFAULT_MOVE_TOLERANCE_PX = 8

function toPoint(event: PointerEvent): GesturePoint {
  return { x: event.clientX, y: event.clientY }
}

export function usePressGesture(options: PressGestureOptions) {
  const longPressMs = options.longPressMs ?? DEFAULT_LONG_PRESS_MS
  const moveTolerancePx = options.moveTolerancePx ?? DEFAULT_MOVE_TOLERANCE_PX

  const isLifted = ref(false)

  let liftTimerId: number | undefined
  let startPoint: GesturePoint | null = null
  let hasMovedSinceLift = false
  let activePointerId: number | null = null
  let captureTarget: HTMLElement | null = null

  function blockTouchScroll(event: TouchEvent) {
    if (isLifted.value) event.preventDefault()
  }

  const SYNTHETIC_MOUSE_EVENTS = ['mousedown', 'mouseup', 'click'] as const

  function swallowSyntheticMouseEvents() {
    function handler(event: Event) {
      event.stopPropagation()
      event.preventDefault()
      if (event.type === 'click') removeHandlers()
    }

    function removeHandlers() {
      SYNTHETIC_MOUSE_EVENTS.forEach((type) =>
        window.removeEventListener(type, handler, true),
      )
    }

    SYNTHETIC_MOUSE_EVENTS.forEach((type) =>
      window.addEventListener(type, handler, true),
    )
    window.setTimeout(removeHandlers, 500)
  }

  function clearLiftTimer() {
    if (liftTimerId !== undefined) {
      window.clearTimeout(liftTimerId)
      liftTimerId = undefined
    }
  }

  function teardown() {
    clearLiftTimer()
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerCancel)
    document.removeEventListener('touchmove', blockTouchScroll)

    if (captureTarget && activePointerId !== null) {
      try {
        captureTarget.releasePointerCapture(activePointerId)
      } catch {
        // Capture may already be gone if the element unmounted mid-gesture.
      }
    }

    isLifted.value = false
    startPoint = null
    hasMovedSinceLift = false
    activePointerId = null
    captureTarget = null
  }

  function onPointerMove(event: PointerEvent) {
    if (!startPoint) return
    const point = toPoint(event)

    if (!isLifted.value) {
      const dx = Math.abs(point.x - startPoint.x)
      const dy = Math.abs(point.y - startPoint.y)
      // Moved before the hold completed — the user is scrolling, not dragging.
      if (dx > moveTolerancePx || dy > moveTolerancePx) {
        options.onCancel?.()
        teardown()
      }
      return
    }

    hasMovedSinceLift = true
    options.onDragMove?.(point)
  }

  function onPointerUp(event: PointerEvent) {
    const wasLifted = isLifted.value
    const movedWhileLifted = hasMovedSinceLift
    const point = toPoint(event)

    if (wasLifted) swallowSyntheticMouseEvents()
    teardown()

    if (!wasLifted) return

    if (movedWhileLifted) {
      options.onDrop?.(point)
    } else {
      options.onLongPress?.(point)
    }
  }

  function onPointerCancel() {
    const wasLifted = isLifted.value
    teardown()
    if (wasLifted) options.onCancel?.()
  }

  function onPointerDown(event: PointerEvent) {
    if (options.isEnabled && !options.isEnabled()) return
    if (!event.isPrimary || event.button !== 0) return

    teardown()

    startPoint = toPoint(event)
    activePointerId = event.pointerId
    captureTarget = event.currentTarget as HTMLElement | null

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
    document.addEventListener('touchmove', blockTouchScroll, { passive: false })

    liftTimerId = window.setTimeout(() => {
      liftTimerId = undefined
      if (!startPoint) return

      isLifted.value = true
      hasMovedSinceLift = false

      if (captureTarget && activePointerId !== null) {
        try {
          captureTarget.setPointerCapture(activePointerId)
        } catch {
          // Pointer capture is best-effort; the window listeners still work.
        }
      }

      navigator.vibrate?.(12)
      options.onLift?.(startPoint)
    }, longPressMs)
  }

  return {
    isLifted,
    onPointerDown,
    /** Abort an in-flight gesture (e.g. the owning list re-rendered). */
    cancel: teardown,
  }
}
