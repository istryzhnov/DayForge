import { nextTick, onMounted, ref, watch, type Ref } from 'vue'
import { normalizeNotes } from './goalSpace/notes'

/**
 * Editing state for a task's notes: a draft that is only committed on blur or
 * Ctrl/Cmd+Enter, and dropped back to the saved text on Esc.
 *
 * `saved` is read live, so the draft follows the stored notes when they change
 * elsewhere (a sync pull, say) — but never overwrites text still being typed.
 */
export function useNotesDraft(
  saved: () => string,
  onCommit: (notes: string) => void,
) {
  const draft = ref(saved())
  const baseline = ref(saved())

  function commit() {
    const next = normalizeNotes(draft.value) ?? ''
    draft.value = next
    if (next === baseline.value) return

    baseline.value = next
    onCommit(next)
  }

  function revert() {
    draft.value = baseline.value
  }

  watch(saved, (value) => {
    if (draft.value === baseline.value) draft.value = value
    baseline.value = value
  })

  return { draft, commit, revert }
}

/** Grows a textarea to fit its text, so a long note never needs its own scroll. */
export function fitTextarea(element: HTMLTextAreaElement | null) {
  if (!element) return
  element.style.height = 'auto'
  element.style.height = `${element.scrollHeight}px`
}

/** Keeps the textarea sized to its draft, including the first paint. */
export function useTextareaFit(
  element: Ref<HTMLTextAreaElement | null>,
  draft: Ref<string>,
) {
  onMounted(() => fitTextarea(element.value))
  watch(draft, () => nextTick(() => fitTextarea(element.value)))
}

/** Ctrl/Cmd+Enter is the keyboard way to commit a note and save the editor. */
export function isCommitShortcut(event: KeyboardEvent): boolean {
  return event.key === 'Enter' && (event.ctrlKey || event.metaKey)
}
