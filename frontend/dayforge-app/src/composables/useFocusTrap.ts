import { onMounted, onUnmounted, useTemplateRef } from 'vue'

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

type FocusTrapOptions = {
  onEscape?: () => void
}

/**
 * Open traps, oldest first. A dialog opened from inside another (the delete
 * confirmation from the profile or settings) takes the keyboard while it is
 * open, and the one underneath stays put until it closes.
 */
const openTraps: symbol[] = []

export function useFocusTrap(options: FocusTrapOptions = {}) {
  const trapRef = useTemplateRef<HTMLElement>(FOCUS_TRAP_REF)
  const trapId = Symbol('focus-trap')
  let previouslyFocused: HTMLElement | null = null

  function focusableElements(): HTMLElement[] {
    const container = trapRef.value
    if (!container) return []

    return Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter(
      // Skip anything hidden — offsetParent is null for display:none subtrees.
      (element) =>
        element.offsetParent !== null || element === document.activeElement,
    )
  }

  function handleKeydown(event: KeyboardEvent) {
    if (openTraps[openTraps.length - 1] !== trapId) return

    if (event.key === 'Escape') {
      // Captured here, so the screen underneath (the settings panel, say)
      // does not also react to the same Escape.
      event.stopPropagation()
      options.onEscape?.()
      return
    }

    if (event.key !== 'Tab') return

    const focusable = focusableElements()
    if (!focusable.length) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement

    if (!trapRef.value?.contains(active)) {
      event.preventDefault()
      first.focus()
      return
    }

    if (event.shiftKey && active === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  onMounted(() => {
    previouslyFocused = document.activeElement as HTMLElement | null
    openTraps.push(trapId)
    // Capture phase, so this runs before any listener further down the page.
    document.addEventListener('keydown', handleKeydown, true)
    // Move focus in so the first Tab continues from the dialog, not the page.
    focusableElements()[0]?.focus()
  })

  onUnmounted(() => {
    const index = openTraps.indexOf(trapId)
    if (index !== -1) openTraps.splice(index, 1)
    document.removeEventListener('keydown', handleKeydown, true)
    previouslyFocused?.focus?.()
  })
}
