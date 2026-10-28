import { computed, onMounted, onUnmounted, useTemplateRef } from 'vue'
import { menuKeyTarget } from './focusRules'

type ContextMenuOptions = {
  getPosition: () => { x: number; y: number }
  onClose: () => void
}

/** Template ref name the consuming menu must put on its root element. */
export const CONTEXT_MENU_REF = 'menuRef'

/** Keeps the menu fully on screen when opened near an edge. */
const VIEWPORT_MARGIN_PX = 8
const ESTIMATED_MENU_WIDTH_PX = 200
const ESTIMATED_MENU_HEIGHT_PX = 160

/**
 * The right-click menus. The consuming template marks its root
 * `role="menu"` and every entry `role="menuitem"`. Arrow keys, Home and End
 * move between entries; Escape or Tab closes the menu, and focus goes back to
 * whatever had it before the menu opened.
 */
export function useContextMenu(options: ContextMenuOptions) {
  const menuRef = useTemplateRef<HTMLElement>(CONTEXT_MENU_REF)
  let menuElement: HTMLElement | null = null
  let previouslyFocused: HTMLElement | null = null

  const menuPositionStyle = computed(() => {
    const { x, y } = options.getPosition()
    const width = menuRef.value?.offsetWidth || ESTIMATED_MENU_WIDTH_PX
    const height = menuRef.value?.offsetHeight || ESTIMATED_MENU_HEIGHT_PX

    const maxLeft =
      document.documentElement.clientWidth - width - VIEWPORT_MARGIN_PX
    const maxTop =
      document.documentElement.clientHeight - height - VIEWPORT_MARGIN_PX

    return {
      left: `${Math.max(VIEWPORT_MARGIN_PX, Math.min(x, maxLeft))}px`,
      top: `${Math.max(VIEWPORT_MARGIN_PX, Math.min(y, maxTop))}px`,
    }
  })

  function menuItems(): HTMLElement[] {
    if (!menuElement) return []
    return Array.from(
      menuElement.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    ).filter(
      (item) =>
        !(item as HTMLButtonElement).disabled && item.offsetParent !== null,
    )
  }

  function handleOutsidePress(event: PointerEvent) {
    if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
      options.onClose()
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') options.onClose()
  }

  function handleMenuKeydown(event: KeyboardEvent) {
    const items = menuItems()
    const target = menuKeyTarget(
      event.key,
      items.indexOf(document.activeElement as HTMLElement),
      items.length,
    )
    if (target !== null) {
      event.preventDefault()
      items[target].focus({ preventScroll: true })
      return
    }
    // A menu is not part of the tab order: Tab closes it and focus returns.
    if (event.key === 'Tab') {
      event.preventDefault()
      options.onClose()
    }
  }

  onMounted(() => {
    menuElement = menuRef.value
    const focused = document.activeElement
    previouslyFocused = focused instanceof HTMLElement ? focused : null

    menuElement?.addEventListener('keydown', handleMenuKeydown)
    menuItems()[0]?.focus({ preventScroll: true })
    document.addEventListener('pointerdown', handleOutsidePress)
    document.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    menuElement?.removeEventListener('keydown', handleMenuKeydown)
    document.removeEventListener('pointerdown', handleOutsidePress)
    document.removeEventListener('keydown', handleKeydown)

    // Only take focus back when the menu held it (or it fell to the page).
    // A click on another control keeps the focus it was given.
    const current = document.activeElement
    const lost =
      !current || current === document.body || !!menuElement?.contains(current)
    if (lost && previouslyFocused?.isConnected) previouslyFocused.focus()
    previouslyFocused = null
  })

  return { menuPositionStyle }
}
