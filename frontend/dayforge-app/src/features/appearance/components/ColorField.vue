<script setup lang="ts">
import { computed, ref } from 'vue'
import { normalizeHex } from '../../../composables/theme/color'
import type { ColorSuggestion } from '../../../composables/theme/suggestions'

const props = defineProps<{
  label: string
  description?: string
  /** The colour in force, whether picked by the user or inherited. */
  value: string
  isCustom: boolean
  suggestions: ColorSuggestion[]
  /** Plain-language readability note for this colour on its surface. */
  contrastMessage?: string
  contrastLevel?: 'good' | 'ok' | 'poor'
}>()

const emit = defineEmits<{
  (e: 'update', color: string): void
  (e: 'reset'): void
}>()

const showSuggestions = ref(false)
const hexDraft = ref<string | null>(null)

// The native picker only speaks `#rrggbb`, so anything inherited from the
// stylesheet (which may be an `rgb()` string) is normalised on the way in.
const pickerValue = computed(() => normalizeHex(props.value, '#000000'))
const hexValue = computed(() => hexDraft.value ?? pickerValue.value)

function onPick(event: Event) {
  const next = (event.target as HTMLInputElement).value
  hexDraft.value = null
  emit('update', next)
}

function onHexInput(event: Event) {
  const raw = (event.target as HTMLInputElement).value
  hexDraft.value = raw
  const candidate = raw.startsWith('#') ? raw : `#${raw}`
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(candidate)) {
    emit('update', normalizeHex(candidate, pickerValue.value))
  }
}

function onHexBlur() {
  hexDraft.value = null
}

function applySuggestion(suggestion: ColorSuggestion) {
  hexDraft.value = null
  emit('update', suggestion.color)
}

function swatchStyle(color: string) {
  return { backgroundColor: color }
}
</script>

<template>
  <div class="color-field">
    <label class="color-field__swatch" :title="`Pick ${label}`">
      <input type="color" :value="pickerValue" @input="onPick" />
      <span
        class="color-field__swatch-fill"
        :style="swatchStyle(pickerValue)"
      ></span>
    </label>

    <div class="color-field__body">
      <div class="color-field__head">
        <span class="color-field__label">{{ label }}</span>
        <span v-if="isCustom" class="color-field__badge">custom</span>
      </div>
      <p v-if="description" class="color-field__desc">{{ description }}</p>

      <div class="color-field__row">
        <input
          class="color-field__hex"
          type="text"
          spellcheck="false"
          :value="hexValue"
          :aria-label="`${label} hex value`"
          @input="onHexInput"
          @blur="onHexBlur"
        />
        <button
          class="color-field__link"
          type="button"
          :aria-expanded="showSuggestions"
          @click="showSuggestions = !showSuggestions"
        >
          {{ showSuggestions ? 'Hide matches' : 'Matches' }}
        </button>
        <button
          v-if="isCustom"
          class="color-field__link color-field__link--reset"
          type="button"
          @click="emit('reset')"
        >
          Reset
        </button>
      </div>

      <p
        v-if="contrastMessage"
        class="color-field__contrast"
        :class="`is-${contrastLevel}`"
      >
        {{ contrastMessage }}
      </p>

      <div v-if="showSuggestions" class="color-field__suggestions">
        <button
          v-for="suggestion in suggestions"
          :key="`${suggestion.label}-${suggestion.color}`"
          class="color-suggestion"
          type="button"
          @click="applySuggestion(suggestion)"
        >
          <span
            class="color-suggestion__dot"
            :style="swatchStyle(suggestion.color)"
          ></span>
          <span class="color-suggestion__text">
            <strong>{{ suggestion.label }}</strong>
            <em>{{ suggestion.hint }}</em>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
