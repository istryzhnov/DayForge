/** Longest note a task can carry; the textarea stops at the same length. */
export const NOTES_MAX_LENGTH = 5000

/**
 * What a note is saved as: trimmed and capped. Blank means no note at all, so
 * the caller drops the field rather than storing an empty string.
 */
export function normalizeNotes(value: string): string | undefined {
  const next = value.trim().slice(0, NOTES_MAX_LENGTH).trimEnd()
  return next === '' ? undefined : next
}
