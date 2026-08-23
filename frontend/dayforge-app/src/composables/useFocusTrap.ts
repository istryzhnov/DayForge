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
 * Keeps keyboard focus inside a dialog: tabbing past the last control wraps to
 * the first, and Shift+Tab off the first wraps to the last. Without this, Tab
 * walks straight out of the panel and into the page behind it, leaving the
 * dialog open but unreachable.
 */
export function useFocusTrap(options: FocusTrapOptions = {}) {
  const trapRef = useTemplateRef<HTMLElement>(FOCUS_TRAP_REF)
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
    if (event.key === 'Escape') {
      options.onEscape?.()
      return
    }

    if (event.key !== 'Tab') return

    const focusable = focusableElements()
    if (!focusable.length) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement

    // Focus sitting outside the dialog (or on the container itself) restarts
    // the cycle rather than escaping into the page.
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
    document.addEventListener('keydown', handleKeydown)
    // Move focus in so the first Tab continues from the dialog, not the page.
    focusableElements()[0]?.focus()
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
    previouslyFocused?.focus?.()
  })
}
