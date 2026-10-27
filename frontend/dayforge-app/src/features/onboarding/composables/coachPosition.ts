import type { TipPlacement } from './tips'

/** Plain pixel box, so the maths runs without touching the DOM. */
export interface CoachBox {
  left: number
  top: number
  width: number
  height: number
}

export interface CoachPosition {
  /** Top-left corner of the bubble, in viewport pixels. */
  left: number
  top: number
  /** Side of the control the bubble ended up on, after any flip. */
  placement: TipPlacement
  /** Arrow offset along the edge it sits on, measured from the bubble's top or left. */
  arrow: number
}

/** Space between the control and the bubble, which the arrow fills. */
const GAP = 14
/** Keeps the arrow clear of the rounded corners of the bubble. */
const ARROW_INSET = 18

const OPPOSITE: Record<TipPlacement, TipPlacement> = {
  bottom: 'top',
  top: 'bottom',
  right: 'left',
  left: 'right',
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/** A control scrolled out of view, or hidden by a closed drawer, has no room to point at. */
export function isOnScreen(
  box: CoachBox,
  viewport: { width: number; height: number },
): boolean {
  return (
    box.width > 0 &&
    box.height > 0 &&
    box.left < viewport.width &&
    box.left + box.width > 0 &&
    box.top < viewport.height &&
    box.top + box.height > 0
  )
}

function fits(
  placement: TipPlacement,
  anchor: CoachBox,
  bubble: { width: number; height: number },
  viewport: { width: number; height: number },
  margin: number,
): boolean {
  switch (placement) {
    case 'bottom':
      return (
        anchor.top + anchor.height + GAP + bubble.height <=
        viewport.height - margin
      )
    case 'top':
      return anchor.top - GAP - bubble.height >= margin
    case 'right':
      return (
        anchor.left + anchor.width + GAP + bubble.width <=
        viewport.width - margin
      )
    case 'left':
      return anchor.left - GAP - bubble.width >= margin
  }
}

/**
 * Places a bubble beside its control and aims the arrow at the control's
 * centre. The preferred side wins unless it overflows and the opposite side
 * fits. Both axes are then clamped to the viewport margin, so a bubble never
 * leaves the screen, and the arrow is kept inside the bubble's edge.
 */
export function placeCoach(
  anchor: CoachBox,
  bubble: { width: number; height: number },
  viewport: { width: number; height: number },
  preferred: TipPlacement,
  margin = 12,
): CoachPosition {
  const placement = fits(preferred, anchor, bubble, viewport, margin)
    ? preferred
    : fits(OPPOSITE[preferred], anchor, bubble, viewport, margin)
      ? OPPOSITE[preferred]
      : preferred

  if (placement === 'top' || placement === 'bottom') {
    const top = clamp(
      placement === 'bottom'
        ? anchor.top + anchor.height + GAP
        : anchor.top - GAP - bubble.height,
      margin,
      viewport.height - bubble.height - margin,
    )
    const centre = anchor.left + anchor.width / 2
    const left = clamp(
      centre - bubble.width / 2,
      margin,
      viewport.width - bubble.width - margin,
    )
    return {
      left,
      top,
      placement,
      arrow: clamp(centre - left, ARROW_INSET, bubble.width - ARROW_INSET),
    }
  }

  const left = clamp(
    placement === 'right'
      ? anchor.left + anchor.width + GAP
      : anchor.left - GAP - bubble.width,
    margin,
    viewport.width - bubble.width - margin,
  )
  const centre = anchor.top + anchor.height / 2
  const top = clamp(
    centre - bubble.height / 2,
    margin,
    viewport.height - bubble.height - margin,
  )
  return {
    left,
    top,
    placement,
    arrow: clamp(centre - top, ARROW_INSET, bubble.height - ARROW_INSET),
  }
}

/** Lets the component skip a state write when a re-measure changed nothing. */
export function isSamePosition(
  a: CoachPosition | null,
  b: CoachPosition | null,
): boolean {
  if (!a || !b) return a === b
  return (
    a.left === b.left &&
    a.top === b.top &&
    a.placement === b.placement &&
    a.arrow === b.arrow
  )
}
