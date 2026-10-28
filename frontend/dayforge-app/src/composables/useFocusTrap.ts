import { nextTick, onMounted, onUnmounted, useTemplateRef, watch } from 'vue'
import { isTopmost, trapTabTarget } from './focusRules'

/** Template ref name the trapped dialog must put on its root element. */
export const FOCUS_TRAP_REF = 'trapRef'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export type FocusTrapOptions = {
  /**
   * Escape handler. Returning `false` lets the key through to the focused
   * control (a combobox that first dismisses its suggestions, say).
   */
  onEscape?: (event: KeyboardEvent) => boolean | void
  /**
   * Default true: everything outside the container is made `inert` while the
   * trap is active, so it cannot be reached by mouse, keyboard or screen
   * reader. Turn off for drawers and popovers that must stay clickable.
   * The container must then hold the overlay too, or it cannot be clicked.
   */
  modal?: boolean
  /**
   * The control that takes focus on activation. Defaults to the first
   * focusable one; return null to leave focus where the caller put it.
   */
  initialFocus?: () => HTMLElement | null
}

export type FocusTrap = {
  activate: () => void
  deactivate: () => void
}

/**
 * Open traps, oldest first. A dialog opened from inside another (the delete
 * confirmation from the profile or settings) takes the keyboard while it is
 * open, and the one underneath stays put until it closes.
 */
const openTraps: symbol[] = []

/** Marks every sibling of the container's ancestor chain inert; returns the ones it changed. */
function makeInertOutside(container: HTMLElement): HTMLElement[] {
  const changed: HTMLElement[] = []
  let node: HTMLElement = container
  while (node.parentElement) {
    for (const sibling of Array.from(node.parentElement.children)) {
      if (sibling === node || !(sibling instanceof HTMLElement)) continue
      if (sibling.inert) continue
      sibling.inert = true
      changed.push(sibling)
    }
    node = node.parentElement
  }
  return changed
}

/**
 * The focus trap behind every modal, popover and drawer. The container is
 * resolved on each use, so it can be a template ref that only exists while
 * the panel is open.
 */
export function createFocusTrap(
  getContainer: () => HTMLElement | null,
  options: FocusTrapOptions = {},
): FocusTrap {
  const trapId = Symbol('focus-trap')
  let active = false
  let previouslyFocused: HTMLElement | null = null
  let inertedElements: HTMLElement[] = []

  function focusableElements(): HTMLElement[] {
    const container = getContainer()
    if (!container) return []

    return Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter(
      // Skip anything hidden: offsetParent is null for display:none subtrees.
      (element) =>
        !element.closest('[inert]') &&
        (element.offsetParent !== null || element === document.activeElement),
    )
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!isTopmost(openTraps, trapId)) return

    if (event.key === 'Escape') {
      if (!options.onEscape) return
      if (options.onEscape(event) === false) return
      // Captured here, so the screen underneath does not react to the same Escape.
      event.stopPropagation()
      return
    }

    if (event.key !== 'Tab') return

    const container = getContainer()
    const focusable = focusableElements()
    const active = document.activeElement
    const target = trapTabTarget({
      count: focusable.length,
      index: focusable.indexOf(active as HTMLElement),
      shift: event.shiftKey,
      inside: !!container && container.contains(active),
    })
    if (target === null) return

    event.preventDefault()
    focusable[target].focus()
  }

  function activate() {
    if (active) return
    active = true

    const focused = document.activeElement
    previouslyFocused = focused instanceof HTMLElement ? focused : null
    openTraps.push(trapId)
    // Capture phase, so this runs before any listener further down the page.
    document.addEventListener('keydown', handleKeydown, true)

    const container = getContainer()
    if (options.modal !== false && container) {
      inertedElements = makeInertOutside(container)
    }
    // Move focus in so the first Tab continues from the dialog, not the page.
    const target = options.initialFocus
      ? options.initialFocus()
      : focusableElements()[0]
    target?.focus()
  }

  function deactivate() {
    if (!active) return
    active = false

    const index = openTraps.indexOf(trapId)
    if (index !== -1) openTraps.splice(index, 1)
    document.removeEventListener('keydown', handleKeydown, true)

    for (const element of inertedElements) element.inert = false
    inertedElements = []

    // Focus goes back only when it was lost with the panel (or sits inside a
    // panel that stays in the DOM). A click on something else keeps its focus.
    const current = document.activeElement
    const lostInside =
      !current ||
      current === document.body ||
      !!getContainer()?.contains(current)
    if (lostInside && previouslyFocused?.isConnected) previouslyFocused.focus()
    previouslyFocused = null
  }

  return { activate, deactivate }
}

/**
 * For a panel that its parent shows and hides with v-if while this component
 * stays mounted. The trap follows `isOpen` and is dropped with the component.
 */
export function useOpenFocusTrap(
  getContainer: () => HTMLElement | null,
  isOpen: () => boolean,
  options: FocusTrapOptions = {},
): FocusTrap {
  const trap = createFocusTrap(getContainer, options)
  watch(
    isOpen,
    async (open) => {
      if (!open) {
        trap.deactivate()
        return
      }
      // The panel is rendered by v-if: wait for it before looking for its controls.
      await nextTick()
      trap.activate()
    },
    { immediate: true },
  )
  onUnmounted(() => trap.deactivate())
  return trap
}

/** For a dialog that mounts with the component and goes away with it. */
export function useFocusTrap(options: FocusTrapOptions = {}): FocusTrap {
  const trapRef = useTemplateRef<HTMLElement>(FOCUS_TRAP_REF)
  const trap = createFocusTrap(() => trapRef.value, options)
  onMounted(() => trap.activate())
  onUnmounted(() => trap.deactivate())
  return trap
}
