<script setup lang="ts">
defineProps<{
  label: string
  /** The parent switches the section on, so no checkbox is drawn here. */
  hideToggle?: boolean
}>()

const isEnabled = defineModel<boolean>({ required: true })
</script>

<template>
  <div class="composer-section">
    <label v-if="!hideToggle" class="composer-section__toggle">
      <input v-model="isEnabled" type="checkbox" />
      <span>{{ label }}</span>
    </label>

    <div v-if="isEnabled" class="composer-section__body">
      <slot />
    </div>
  </div>
</template>
