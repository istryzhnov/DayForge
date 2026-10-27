import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { normalizeNotes } from '../../../composables/goalSpace/notes'

const SAVE_DELAY_MS = 800

/**
 * Draft of a project's notes that saves while typing, on blur and on close.
 *
 * The draft keeps its raw text (trailing spaces and newlines included) so the
 * user is never interrupted mid-typing; only what gets saved is normalised.
 * `saved` is read live, so a sync pull updates the draft unless there are
 * unsaved edits still in it.
 */
export function useProjectNotes(
  saved: () => string,
  onSave: (notes: string) => void,
) {
  const draft = ref(saved())
  const baseline = ref(normalizeNotes(saved()) ?? '')
  let timer: ReturnType<typeof setTimeout> | null = null

  function flush() {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    const next = normalizeNotes(draft.value) ?? ''
    if (next === baseline.value) return

    baseline.value = next
    onSave(next)
  }

  function scheduleSave() {
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(flush, SAVE_DELAY_MS)
  }

  watch(draft, scheduleSave)

  watch(saved, (value) => {
    const normalized = normalizeNotes(value) ?? ''
    if (normalized === baseline.value) return

    if ((normalizeNotes(draft.value) ?? '') === baseline.value) {
      draft.value = value
    }
    baseline.value = normalized
  })

  // A closed tab must not lose the last few keystrokes.
  onMounted(() => window.addEventListener('pagehide', flush))
  onBeforeUnmount(() => {
    window.removeEventListener('pagehide', flush)
    flush()
  })

  return { draft, flush }
}
