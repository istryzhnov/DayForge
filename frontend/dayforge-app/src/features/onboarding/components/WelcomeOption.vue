<script setup lang="ts">
import AppIcon from '../../../components/AppIcon.vue'
import type { AppIconName } from '../../../components/appIconPaths'

/** One large choice on a welcome step. `aria-pressed` carries the selection. */
defineProps<{
  icon: AppIconName
  label: string
  description: string
  selected: boolean
  disabled?: boolean
}>()

defineEmits<{
  (e: 'select'): void
}>()
</script>

<template>
  <button
    class="welcome-option"
    type="button"
    :aria-pressed="selected"
    :disabled="disabled"
    @click="$emit('select')"
  >
    <span class="welcome-option__icon" aria-hidden="true">
      <AppIcon :name="icon" :size="20" />
    </span>
    <span class="welcome-option__text">
      <strong class="welcome-option__label">{{ label }}</strong>
      <span class="welcome-option__description">{{ description }}</span>
    </span>
  </button>
</template>
