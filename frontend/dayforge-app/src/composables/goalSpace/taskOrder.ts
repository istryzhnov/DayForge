/**
 * Puts one item next to another in a list that is stored oldest first and
 * drawn newest first, so landing *above* a row means sitting *after* it in
 * storage. Returns null when the list would not change.
 */
export function placeBeside<T extends { id: string }>(
  list: T[],
  movedId: string,
  targetId: string,
  placeAbove: boolean,
): T[] | null {
  if (movedId === targetId) return null

  const next = [...list]
  const from = next.findIndex((item) => item.id === movedId)
  if (from === -1) return null

  const [moved] = next.splice(from, 1)
  const target = next.findIndex((item) => item.id === targetId)
  if (target === -1) return null

  next.splice(placeAbove ? target + 1 : target, 0, moved)

  const unchanged = next.every((item, index) => item.id === list[index].id)
  return unchanged ? null : next
}
