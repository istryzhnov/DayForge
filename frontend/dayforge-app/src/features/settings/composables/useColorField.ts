import { computed, ref } from 'vue'
import { normalizeHex } from '../../../composables/theme/color'
import type { ColorSuggestion } from '../../../composables/theme/suggestions'

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
