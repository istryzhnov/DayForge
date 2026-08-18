import { onUnmounted, readonly, ref, type Ref } from 'vue'

/**
 * Reactive `window.matchMedia` wrapper. Returns a ref that stays in sync with
 * the query, so layout/behavior branches can react to viewport or input-device
 * changes (rotating a tablet, attaching a mouse) instead of being sampled once
 * at module load.
 */
export function useMediaQuery(query: string): Readonly<Ref<boolean>> {
  const matches = ref(false)

  if (typeof window === 'undefined' || !window.matchMedia) {
    return readonly(matches)
  }

  const mediaQueryList = window.matchMedia(query)
  matches.value = mediaQueryList.matches

  function handleChange(event: MediaQueryListEvent) {
    matches.value = event.matches
  }

  mediaQueryList.addEventListener('change', handleChange)
  onUnmounted(() => mediaQueryList.removeEventListener('change', handleChange))

  return readonly(matches)
}

/**
 * True on devices whose primary input is touch. Drives the touch gesture path
 * (long-press to lift, drag with pointer events) instead of HTML5 native
 * drag-and-drop, which does not fire on touch screens.
 */
export function useIsCoarsePointer(): Readonly<Ref<boolean>> {
  return useMediaQuery('(pointer: coarse)')
}
