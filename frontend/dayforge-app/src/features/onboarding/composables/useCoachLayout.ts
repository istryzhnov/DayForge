import { onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import type { TipPlacement } from './tips'
import {
  isOnScreen,
  isSamePosition,
  placeCoach,
  type CoachPosition,
} from './coachPosition'

/** A control a bubble points at, and the side it prefers. */
export interface CoachTarget {
  el: Element
  placement: TipPlacement
}

/** Keeps a bubble from leaving a phone screen; the CSS uses the same width. */
const BUBBLE_WIDTH = 280
const MARGIN = 12

function viewport() {
  return { width: window.innerWidth, height: window.innerHeight }
}

/**
 * A closed phone drawer is moved off screen and hidden, so its controls can
 * have a box without being usable. Visibility is checked for that case.
 */
function isShown(el: Element): boolean {
  return el.checkVisibility?.({ visibilityProperty: true }) ?? true
}

/** The first control matching the selector that is shown and on screen. */
export function findOnScreen(selector: string): Element | null {
  const found = Array.from(document.querySelectorAll(selector))
  return (
    found.find(
      (el) => isShown(el) && isOnScreen(el.getBoundingClientRect(), viewport()),
    ) ?? null
  )
}

/** A dialog covers the page, so a bubble under it would only be noise. */
export function dialogOpen(): boolean {
  return document.querySelector('[aria-modal="true"]') !== null
}

function sameTarget<T extends CoachTarget>(a: T | null, b: T): boolean {
  if (!a) return false
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  return (
    keysA.length === keysB.length &&
    keysB.every((key) => a[key as keyof T] === b[key as keyof T])
  )
}

/**
 * Places a bubble beside the control `resolve` returns, and keeps it there as
 * the page scrolls, resizes, or the control or bubble changes size. `resolve`
 * returns null when there is nothing to point at, which clears the position.
 */
export function useCoachLayout<T extends CoachTarget>(
  resolve: () => T | null,
  bubbleEl: () => HTMLElement | null,
) {
  /** What the bubble is about, or null while nothing is pointed at. */
  const target = shallowRef<T | null>(null)
  const position = ref<CoachPosition | null>(null)

  let anchorEl: Element | null = null
  let frame = 0

  // Watches the control's and the bubble's size, so either one changing re-places it.
  const resizeObserver = new ResizeObserver(() => schedule())
  // Lazily loaded views mount their controls later, so watch for new nodes too.
  const mutationObserver = new MutationObserver(() => schedule())

  /** Measured after render, so a bubble that changes size is placed again. */
  function bubbleSize(el: HTMLElement | null) {
    if (!el) {
      return {
        width: Math.min(BUBBLE_WIDTH, viewport().width - 2 * MARGIN),
        height: 120,
      }
    }
    return { width: el.offsetWidth, height: el.offsetHeight }
  }

  function setAnchor(el: Element | null) {
    if (el === anchorEl) return
    if (anchorEl) resizeObserver.unobserve(anchorEl)
    anchorEl = el
    if (el) resizeObserver.observe(el)
  }

  function hide() {
    setAnchor(null)
    if (target.value) target.value = null
    if (position.value) position.value = null
  }

  function update() {
    frame = 0
    const found = resolve()
    if (!found) {
      hide()
      return
    }
    setAnchor(found.el)
    if (!sameTarget(target.value, found)) target.value = found
    const next = placeCoach(
      found.el.getBoundingClientRect(),
      bubbleSize(bubbleEl()),
      viewport(),
      found.placement,
      MARGIN,
    )
    if (!isSamePosition(next, position.value)) position.value = next
  }

  /** Coalesces the many events that can move a control into one measure per frame. */
  function schedule() {
    if (frame) return
    frame = requestAnimationFrame(update)
  }

  // The bubble's own size is only known once it renders, so measure it then.
  watch(
    bubbleEl,
    (el) => {
      if (el) resizeObserver.observe(el)
      schedule()
    },
    { flush: 'post' },
  )

  onMounted(() => {
    mutationObserver.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('scroll', schedule, {
      capture: true,
      passive: true,
    })
    window.addEventListener('resize', schedule)
    schedule()
  })

  onUnmounted(() => {
    mutationObserver.disconnect()
    resizeObserver.disconnect()
    window.removeEventListener('scroll', schedule, { capture: true })
    window.removeEventListener('resize', schedule)
    cancelAnimationFrame(frame)
  })

  return { target, position, schedule, hide }
}
