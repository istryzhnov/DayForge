import type { ID } from '../../../entities/types'

/** How long the search-hit highlight stays on a row. */
const FLASH_MS = 1600
/** Frames to wait for the project view to render the row. */
const MAX_ATTEMPTS = 12

const flashTimers = new WeakMap<HTMLElement, number>()

/**
 * Scrolls the task row with this daily-row id into view and flashes it. The
 * row may not exist yet when a project has just been opened, so this retries
 * for a few frames and gives up quietly if the row is not on screen.
 */
export function flashTaskRow(taskId: ID, attempt = 0) {
  requestAnimationFrame(() => {
    const row = document.querySelector<HTMLElement>(
      `[data-task-id="${CSS.escape(taskId)}"]`,
    )
    if (!row) {
      if (attempt < MAX_ATTEMPTS) flashTaskRow(taskId, attempt + 1)
      return
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    row.scrollIntoView({
      block: 'center',
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    })

    // Restart the animation if the same row is hit twice in a row.
    row.classList.remove('is-search-hit')
    void row.offsetWidth
    row.classList.add('is-search-hit')

    const previous = flashTimers.get(row)
    if (previous !== undefined) window.clearTimeout(previous)
    flashTimers.set(
      row,
      window.setTimeout(() => {
        row.classList.remove('is-search-hit')
        flashTimers.delete(row)
      }, FLASH_MS),
    )
  })
}
