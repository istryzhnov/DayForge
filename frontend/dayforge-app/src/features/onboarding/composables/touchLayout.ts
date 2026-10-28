/** Touch or a phone-width screen: the same cut the phone layout uses. */
export const TOUCH_LAYOUT_QUERY = '(pointer: coarse), (max-width: 720px)'

/** Read when a chapter starts, so its steps match the device it was started on. */
export function isTouchLayout(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia !== undefined &&
      window.matchMedia(TOUCH_LAYOUT_QUERY).matches
    )
  } catch {
    return false
  }
}
