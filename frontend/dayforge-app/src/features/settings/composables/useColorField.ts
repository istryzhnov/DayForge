import { computed, ref } from 'vue'
import { normalizeHex } from '../../../composables/theme/color'
import type { ColorSuggestion } from '../../../composables/theme/suggestions'

/**
 * One colour row: a native picker, a hex box and a list of companions.
 *
 * The hex box keeps its own draft while it is being typed — a half-finished
 * `#3d` is not a colour, and pushing every keystroke to the theme would repaint
 * the app with garbage. The draft is dropped as soon as the text parses, so the
 * field goes back to showing whatever the theme actually resolved to.
 */

const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

type ColorFieldProps = {
  value: string
}

type ColorFieldActions = {
  onUpdate: (color: string) => void
}

export function useColorField(
  props: ColorFieldProps,
  actions: ColorFieldActions,
) {
  const showSuggestions = ref(false)
  const hexDraft = ref<string | null>(null)

  // The native picker only speaks `#rrggbb`, so anything inherited from the
  // stylesheet (which may be an `rgb()` string) is normalised on the way in.
  const pickerValue = computed(() => normalizeHex(props.value, '#000000'))
  const hexValue = computed(() => hexDraft.value ?? pickerValue.value)

  function toggleSuggestions() {
    showSuggestions.value = !showSuggestions.value
  }

  function pickColor(color: string) {
    hexDraft.value = null
    actions.onUpdate(color)
  }

  function typeHex(raw: string) {
    hexDraft.value = raw
    const candidate = raw.startsWith('#') ? raw : `#${raw}`
    if (HEX_PATTERN.test(candidate)) {
      actions.onUpdate(normalizeHex(candidate, pickerValue.value))
    }
  }

  /** Leaving the field abandons an unparseable draft. */
  function commitHex() {
    hexDraft.value = null
  }

  function applySuggestion(suggestion: ColorSuggestion) {
    pickColor(suggestion.color)
  }

  return {
    showSuggestions,
    pickerValue,
    hexValue,
    toggleSuggestions,
    pickColor,
    typeHex,
    commitHex,
    applySuggestion,
  }
}
