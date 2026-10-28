/**
 * Focus rules shared by the focus trap and the menus. Pure: no DOM, so the
 * compat checks can run them under Node.
 */

/**
 * Where Tab goes inside a trapped container. `null` leaves the key to the
 * browser, which moves focus to the next control in the page order.
 */
export function trapTabTarget(args: {
  count: number
  index: number
  shift: boolean
  /** Whether focus is currently inside the container at all. */
  inside: boolean
}): number | null {
  if (args.count === 0) return null
  if (!args.inside) return args.shift ? args.count - 1 : 0
  if (args.shift && args.index === 0) return args.count - 1
  if (!args.shift && args.index === args.count - 1) return 0
  return null
}

/**
 * Where an arrow / Home / End key moves inside a menu. `index` is -1 when
 * nothing in the menu has focus yet. `null` means the key is not a menu key.
 */
export function menuKeyTarget(
  key: string,
  index: number,
  count: number,
): number | null {
  if (count === 0) return null
  switch (key) {
    case 'ArrowDown':
      return index < 0 ? 0 : (index + 1) % count
    case 'ArrowUp':
      return index < 0 ? count - 1 : (index - 1 + count) % count
    case 'Home':
      return 0
    case 'End':
      return count - 1
    default:
      return null
  }
}

/** Only the newest open trap answers the keyboard; the ones below wait. */
export function isTopmost<T>(stack: readonly T[], id: T): boolean {
  return stack.length > 0 && stack[stack.length - 1] === id
}
