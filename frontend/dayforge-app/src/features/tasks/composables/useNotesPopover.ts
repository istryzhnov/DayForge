import { computed, ref } from 'vue'

/**
 * Only one notes popover is open at a time. Opening one takes the slot; the
 * others see `isOpen` turn false and unmount (committing their draft first).
 */
const openOwner = ref<symbol | null>(null)

export function useNotesPopoverSlot() {
  const owner = Symbol('notes-popover')
  const isOpen = computed(() => openOwner.value === owner)

  function open() {
    openOwner.value = owner
  }

  function release() {
    if (openOwner.value === owner) openOwner.value = null
  }

  return { isOpen, open, release }
}

export type PopoverPosition = { left: number; top: number }

const GAP_PX = 8
const MARGIN_PX = 8

/**
 * Places a popover under its anchor, right-aligned to it. It flips above the
 * anchor when there is no room below, and is clamped inside the viewport.
 */
export function placePopover(
  anchor: DOMRect,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
): PopoverPosition {
  const maxLeft = viewport.width - size.width - MARGIN_PX
  const left = Math.max(MARGIN_PX, Math.min(anchor.right - size.width, maxLeft))

  const below = anchor.bottom + GAP_PX
  const above = anchor.top - GAP_PX - size.height
  const fitsBelow = below + size.height <= viewport.height - MARGIN_PX
  const preferred = fitsBelow || above < MARGIN_PX ? below : above
  const maxTop = viewport.height - size.height - MARGIN_PX
  const top = Math.max(MARGIN_PX, Math.min(preferred, maxTop))

  return { left, top }
}
