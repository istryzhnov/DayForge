<script setup lang="ts">
import AppIcon from '../../../shared/ui/AppIcon.vue'

defineProps<{
  label: string
  /** The parent switches the section on, so no button is drawn here. */
  hideToggle?: boolean
}>()

const isEnabled = defineModel<boolean>({ required: true })
</script>

<template>
  <div class="composer-section">
    <!-- A pressed button rather than a checkbox: the icon names the action and
         aria-pressed carries the on/off state for assistive tech. -->
    <button
      v-if="!hideToggle"
      type="button"
      class="ui-chip composer-section__toggle"
      :class="{ 'is-active': isEnabled }"
      :aria-pressed="isEnabled"
      @click="isEnabled = !isEnabled"
    >
      <AppIcon name="calendar" :size="16" />
      <span>{{ label }}</span>
    </button>

    <div v-if="isEnabled" class="composer-section__body">
      <slot />
    </div>
  </div>
</template>
