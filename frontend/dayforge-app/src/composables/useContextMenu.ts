import { computed, onMounted, onUnmounted, useTemplateRef } from 'vue'

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

export function useContextMenu(options: ContextMenuOptions) {
  const menuRef = useTemplateRef<HTMLElement>(CONTEXT_MENU_REF)

  const menuPositionStyle = computed(() => {
    const { x, y } = options.getPosition()
    const width = menuRef.value?.offsetWidth || ESTIMATED_MENU_WIDTH_PX
    const height = menuRef.value?.offsetHeight || ESTIMATED_MENU_HEIGHT_PX

    const maxLeft = window.innerWidth - width - VIEWPORT_MARGIN_PX
    const maxTop = window.innerHeight - height - VIEWPORT_MARGIN_PX

    return {
      left: `${Math.max(VIEWPORT_MARGIN_PX, Math.min(x, maxLeft))}px`,
      top: `${Math.max(VIEWPORT_MARGIN_PX, Math.min(y, maxTop))}px`,
    }
  })

  function handleOutsidePress(event: PointerEvent) {
    if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
      options.onClose()
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') options.onClose()
  }

  onMounted(() => {
    document.addEventListener('pointerdown', handleOutsidePress)
    document.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    document.removeEventListener('pointerdown', handleOutsidePress)
    document.removeEventListener('keydown', handleKeydown)
  })

  return { menuPositionStyle }
}
