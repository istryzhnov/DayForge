import { onUnmounted, readonly, ref, type Ref } from 'vue'

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

export function useIsCoarsePointer(): Readonly<Ref<boolean>> {
  return useMediaQuery('(pointer: coarse)')
}
